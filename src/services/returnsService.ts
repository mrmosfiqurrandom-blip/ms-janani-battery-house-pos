import {
  collection,
  getDocs,
  doc,
  runTransaction,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { SalesReturn, PurchaseReturn } from '../types';

export const returnsService = {
  subscribeSalesReturns(
    callback: (returns: SalesReturn[]) => void,
    onError?: (error: Error) => void
  ) {
    const q = query(collection(db, 'sales_returns'), orderBy('date', 'desc'));
    return onSnapshot(
      q,
      (snapshot) => {
        const list = snapshot.docs.map((d) => ({
          id: d.id,
          ...(d.data() as any),
        })) as SalesReturn[];
        callback(list);
      },
      (error) => {
        console.error('Sales returns listener error:', error);
        if (onError) onError(error);
      }
    );
  },

  async getSalesReturns(): Promise<SalesReturn[]> {
    try {
      const snap = await getDocs(query(collection(db, 'sales_returns'), orderBy('date', 'desc')));
      return snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as SalesReturn[];
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'sales_returns');
    }
  },

  /**
   * Sales Return:
   * 1. Reverses stock (increments product currentStock)
   * 2. Adds stock_movements entry with type: 'SALES_RETURN'
   * 3. Adjusts customer due balance if applicable
   * 4. Deducts refund amount from payment account if refunded
   * 5. Saves record to `sales_returns`
   */
  async createSalesReturn(data: Omit<SalesReturn, 'id' | 'returnNo'>): Promise<SalesReturn> {
    const returnId = `sr-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const returnNo = `SR-${Date.now().toString().slice(-6)}`;
    const nowIso = new Date().toISOString();
    const newReturn: SalesReturn = {
      ...data,
      id: returnId,
      returnNo,
    };

    try {
      await runTransaction(db, async (tx) => {
        // Reads
        const prodRef = doc(db, 'products', data.productId);
        const prodSnap = await tx.get(prodRef);
        const prodData = prodSnap.exists() ? prodSnap.data() : null;

        let custRef: any = null;
        let custData: any = null;
        if (data.customerId && data.customerId !== 'cst-walkin') {
          custRef = doc(db, 'customers', data.customerId);
          const cSnap = await tx.get(custRef);
          if (cSnap.exists()) custData = cSnap.data();
        }

        let accRef: any = null;
        let accData: any = null;
        if (data.refundAmount > 0 && data.accountId) {
          accRef = doc(db, 'accounts', data.accountId);
          const aSnap = await tx.get(accRef);
          if (aSnap.exists()) accData = aSnap.data();
        }

        // Writes
        const sRetRef = doc(db, 'sales_returns', returnId);
        tx.set(sRetRef, {
          ...newReturn,
          createdAt: serverTimestamp(),
        });

        // Reverse stock: increase stock by returned quantity
        const currentStock = prodData ? prodData.currentStock || 0 : 0;
        const newStock = currentStock + data.quantity;

        if (prodData) {
          tx.update(prodRef, {
            currentStock: newStock,
            updatedAt: serverTimestamp(),
          });
        }

        // Stock movement entry
        const movId = `sm-sret-${Date.now()}-${Math.floor(Math.random() * 100)}`;
        const movRef = doc(db, 'stock_movements', movId);
        tx.set(movRef, {
          id: movId,
          date: data.date || nowIso,
          productId: data.productId,
          productName: data.productName,
          sku: prodData?.sku || '',
          type: 'SALES_RETURN',
          quantityIn: data.quantity,
          quantityOut: 0,
          balance: newStock,
          reference: returnNo,
          notes: `Sales Return for #${data.saleInvoiceNo}. Reason: ${data.reason}`,
          createdAt: serverTimestamp(),
        });

        // Customer due adjustment
        if (custRef && custData && data.refundAmount > 0) {
          const currentDue = custData.currentDue || 0;
          tx.update(custRef, {
            currentDue: Math.max(0, currentDue - data.refundAmount),
            updatedAt: serverTimestamp(),
          });
        }

        // Deduct refund from account
        if (accRef && accData && data.refundAmount > 0) {
          const balance = accData.balance || 0;
          tx.update(accRef, {
            balance: Math.max(0, balance - data.refundAmount),
            updatedAt: serverTimestamp(),
          });
        }
      });

      return newReturn;
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `sales_returns/${returnId}`);
    }
  },

  subscribePurchaseReturns(
    callback: (returns: PurchaseReturn[]) => void,
    onError?: (error: Error) => void
  ) {
    const q = query(collection(db, 'purchase_returns'), orderBy('date', 'desc'));
    return onSnapshot(
      q,
      (snapshot) => {
        const list = snapshot.docs.map((d) => ({
          id: d.id,
          ...(d.data() as any),
        })) as PurchaseReturn[];
        callback(list);
      },
      (error) => {
        console.error('Purchase returns listener error:', error);
        if (onError) onError(error);
      }
    );
  },

  async getPurchaseReturns(): Promise<PurchaseReturn[]> {
    try {
      const snap = await getDocs(query(collection(db, 'purchase_returns'), orderBy('date', 'desc')));
      return snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as PurchaseReturn[];
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'purchase_returns');
    }
  },

  /**
   * Purchase Return:
   * 1. Reverses stock (decreases product currentStock)
   * 2. Adds stock_movements entry with type: 'PURCHASE_RETURN'
   * 3. Adjusts supplier due balance
   * 4. Saves record to `purchase_returns`
   */
  async createPurchaseReturn(data: Omit<PurchaseReturn, 'id' | 'returnNo'>): Promise<PurchaseReturn> {
    const returnId = `pr-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const returnNo = `PR-${Date.now().toString().slice(-6)}`;
    const nowIso = new Date().toISOString();
    const newReturn: PurchaseReturn = {
      ...data,
      id: returnId,
      returnNo,
    };

    try {
      await runTransaction(db, async (tx) => {
        const prodRef = doc(db, 'products', data.productId);
        const prodSnap = await tx.get(prodRef);
        const prodData = prodSnap.exists() ? prodSnap.data() : null;

        let supRef: any = null;
        let supData: any = null;
        if (data.supplierId) {
          supRef = doc(db, 'suppliers', data.supplierId);
          const sSnap = await tx.get(supRef);
          if (sSnap.exists()) supData = sSnap.data();
        }

        // Writes
        const pRetRef = doc(db, 'purchase_returns', returnId);
        tx.set(pRetRef, {
          ...newReturn,
          createdAt: serverTimestamp(),
        });

        // Reverse stock: decrease stock by returned quantity
        const currentStock = prodData ? prodData.currentStock || 0 : 0;
        const newStock = Math.max(0, currentStock - data.quantity);

        if (prodData) {
          tx.update(prodRef, {
            currentStock: newStock,
            updatedAt: serverTimestamp(),
          });
        }

        // Stock movement entry
        const movId = `sm-pret-${Date.now()}-${Math.floor(Math.random() * 100)}`;
        const movRef = doc(db, 'stock_movements', movId);
        tx.set(movRef, {
          id: movId,
          date: data.date || nowIso,
          productId: data.productId,
          productName: data.productName,
          sku: prodData?.sku || '',
          type: 'PURCHASE_RETURN',
          quantityIn: 0,
          quantityOut: data.quantity,
          balance: newStock,
          reference: returnNo,
          notes: `Purchase Return for #${data.purchaseInvoiceNo}. Reason: ${data.reason}`,
          createdAt: serverTimestamp(),
        });

        // Adjust supplier payable
        if (supRef && supData && data.returnAmount > 0) {
          const currentDue = supData.currentDue || 0;
          tx.update(supRef, {
            currentDue: Math.max(0, currentDue - data.returnAmount),
            updatedAt: serverTimestamp(),
          });
        }
      });

      return newReturn;
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `purchase_returns/${returnId}`);
    }
  },
};
