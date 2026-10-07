import {
  collection,
  getDocs,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  runTransaction,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { Sale, SaleStatus } from '../types';

export interface SalesFilters {
  status?: SaleStatus | 'ALL';
  customerId?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
}

export const salesService = {
  subscribeSales(
    callback: (sales: Sale[]) => void,
    filters?: SalesFilters,
    onError?: (error: Error) => void
  ) {
    const q = query(collection(db, 'sales'), orderBy('date', 'desc'));
    return onSnapshot(
      q,
      (snapshot) => {
        let result = snapshot.docs.map((d) => ({
          id: d.id,
          ...(d.data() as any),
        })) as Sale[];

        if (filters) {
          if (filters.status && filters.status !== 'ALL') {
            result = result.filter((s) => s.status === filters.status);
          }
          if (filters.customerId) {
            result = result.filter((s) => s.customerId === filters.customerId);
          }
          if (filters.search) {
            const qStr = filters.search.toLowerCase();
            result = result.filter(
              (s) =>
                s.invoiceNo.toLowerCase().includes(qStr) ||
                s.customerName.toLowerCase().includes(qStr) ||
                (s.customerPhone && s.customerPhone.toLowerCase().includes(qStr))
            );
          }
          if (filters.startDate) {
            result = result.filter((s) => s.date >= filters.startDate!);
          }
          if (filters.endDate) {
            result = result.filter((s) => s.date <= filters.endDate!);
          }
        }
        callback(result);
      },
      (error) => {
        console.error('Sales listener error:', error);
        if (onError) onError(error);
      }
    );
  },

  async getSales(filters?: SalesFilters): Promise<Sale[]> {
    try {
      const snap = await getDocs(query(collection(db, 'sales'), orderBy('date', 'desc')));
      let result = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as Sale[];

      if (filters) {
        if (filters.status && filters.status !== 'ALL') {
          result = result.filter((s) => s.status === filters.status);
        }
        if (filters.customerId) {
          result = result.filter((s) => s.customerId === filters.customerId);
        }
        if (filters.search) {
          const qStr = filters.search.toLowerCase();
          result = result.filter(
            (s) =>
              s.invoiceNo.toLowerCase().includes(qStr) ||
              s.customerName.toLowerCase().includes(qStr) ||
              (s.customerPhone && s.customerPhone.toLowerCase().includes(qStr))
          );
        }
        if (filters.startDate) {
          result = result.filter((s) => s.date >= filters.startDate!);
        }
        if (filters.endDate) {
          result = result.filter((s) => s.date <= filters.endDate!);
        }
      }
      return result;
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'sales');
    }
  },

  async getSale(id: string): Promise<Sale | undefined> {
    try {
      const snap = await getDoc(doc(db, 'sales', id));
      if (snap.exists()) {
        return { id: snap.id, ...(snap.data() as any) } as Sale;
      }
      return undefined;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, `sales/${id}`);
    }
  },

  /**
   * Atomic Sale Execution:
   * 1. Writes sale to `sales/{saleId}`
   * 2. Writes line items to `sale_items/{saleItemId}`
   * 3. Decreases currentStock of each product and adds `stock_movements` entry
   * 4. Updates customer currentDue on credit sales (and totalPurchased & totalPaid)
   * 5. Saves old battery buyback records to `buyback_records`
   * 6. Updates account balance & creates `payments` record if paidAmount > 0
   */
  async createSale(saleData: Omit<Sale, 'id' | 'createdAt'>): Promise<Sale> {
    const saleId = `sal-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const nowIso = new Date().toISOString();
    const newSale: Sale = {
      ...saleData,
      id: saleId,
      createdAt: nowIso,
    };

    try {
      await runTransaction(db, async (tx) => {
        // 1. Read product stocks first (all transaction reads before writes)
        const productSnapshots: { ref: any; data: any; item: any }[] = [];
        for (const item of newSale.items) {
          const pRef = doc(db, 'products', item.productId);
          const pSnap = await tx.get(pRef);
          productSnapshots.push({
            ref: pRef,
            data: pSnap.exists() ? pSnap.data() : null,
            item,
          });
        }

        // 2. Read customer doc if applicable
        let custRef: any = null;
        let custData: any = null;
        if (newSale.customerId && newSale.customerId !== 'cst-walkin') {
          custRef = doc(db, 'customers', newSale.customerId);
          const cSnap = await tx.get(custRef);
          if (cSnap.exists()) {
            custData = cSnap.data();
          }
        }

        // 3. Read account doc if payment collected
        let accRef: any = null;
        let accData: any = null;
        if (newSale.paidAmount > 0 && newSale.accountId) {
          accRef = doc(db, 'accounts', newSale.accountId);
          const aSnap = await tx.get(accRef);
          if (aSnap.exists()) {
            accData = aSnap.data();
          }
        }

        // NOW PERFORM ALL WRITES:

        // 4. Write primary sale document to `sales`
        const saleRef = doc(db, 'sales', saleId);
        tx.set(saleRef, {
          ...newSale,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });

        // 5. Write each item to `sale_items` & reduce stock & record `stock_movements`
        let itemIndex = 0;
        for (const pInfo of productSnapshots) {
          itemIndex++;
          const saleItemId = `${saleId}-item-${itemIndex}`;
          const saleItemRef = doc(db, 'sale_items', saleItemId);
          tx.set(saleItemRef, {
            id: saleItemId,
            saleId,
            invoiceNo: newSale.invoiceNo,
            productId: pInfo.item.productId,
            productName: pInfo.item.productName,
            sku: pInfo.item.sku || '',
            unit: pInfo.item.unit || 'pcs',
            unitPrice: pInfo.item.unitPrice,
            quantity: pInfo.item.quantity,
            total: pInfo.item.total,
            createdAt: serverTimestamp(),
          });

          // Stock reduction and stock_movements
          const currentStock = pInfo.data ? pInfo.data.currentStock || 0 : 0;
          const newStock = Math.max(0, currentStock - pInfo.item.quantity);

          if (pInfo.data) {
            tx.update(pInfo.ref, {
              currentStock: newStock,
              updatedAt: serverTimestamp(),
            });
          }

          const movId = `sm-sale-${Date.now()}-${itemIndex}-${Math.floor(Math.random() * 100)}`;
          const movRef = doc(db, 'stock_movements', movId);
          tx.set(movRef, {
            id: movId,
            date: newSale.date || nowIso,
            productId: pInfo.item.productId,
            productName: pInfo.item.productName,
            sku: pInfo.item.sku || '',
            type: 'SALE',
            quantityIn: 0,
            quantityOut: pInfo.item.quantity,
            balance: newStock,
            reference: newSale.invoiceNo,
            notes: `POS Sale Invoice #${newSale.invoiceNo}`,
            createdAt: serverTimestamp(),
          });
        }

        // 6. Update customer balance automatically
        if (custRef && custData) {
          const currentDue = custData.currentDue || 0;
          const totalPurchased = custData.totalPurchased || 0;
          const totalPaid = custData.totalPaid || 0;

          const updatedDue = newSale.dueAmount > 0 ? currentDue + newSale.dueAmount : currentDue;
          const updatedPurchased = totalPurchased + (newSale.netPayable || 0);
          const updatedPaid = totalPaid + (newSale.paidAmount || 0);

          tx.update(custRef, {
            currentDue: updatedDue,
            totalPurchased: updatedPurchased,
            totalPaid: updatedPaid,
            updatedAt: serverTimestamp(),
          });
        }

        // 7. Record old battery buybacks in `buyback_records`
        if (newSale.oldBatteryBuybacks && newSale.oldBatteryBuybacks.length > 0) {
          let bbIndex = 0;
          for (const bb of newSale.oldBatteryBuybacks) {
            bbIndex++;
            const bbId = `bb-${Date.now()}-${bbIndex}-${Math.floor(Math.random() * 100)}`;
            const bbRef = doc(db, 'buyback_records', bbId);
            tx.set(bbRef, {
              id: bbId,
              saleId,
              invoiceNo: newSale.invoiceNo,
              customerId: newSale.customerId || '',
              customerName: newSale.customerName || 'Walk-in Customer',
              batteryType: bb.batteryType || 'Old Scrap Battery',
              brand: bb.brand || 'Recycled',
              capacityAh: bb.capacityAh || '',
              condition: bb.condition || 'SCRAP',
              quantity: bb.quantity || 1,
              unitPrice: bb.unitPrice || 0,
              totalAmount: bb.totalAmount || 0,
              status: 'IN_STOCK',
              date: newSale.date || nowIso,
              createdAt: serverTimestamp(),
            });
          }
        }

        // 8. Update account balance and record in `payments` if paidAmount > 0
        if (newSale.paidAmount > 0) {
          if (accRef && accData) {
            const accBalance = accData.balance || 0;
            tx.update(accRef, {
              balance: accBalance + newSale.paidAmount,
              updatedAt: serverTimestamp(),
            });
          }

          const payId = `pay-sale-${Date.now()}-${Math.floor(Math.random() * 100)}`;
          const payRef = doc(db, 'payments', payId);
          tx.set(payRef, {
            id: payId,
            paymentNo: `RCP-${newSale.invoiceNo}`,
            type: 'CUSTOMER',
            partyId: newSale.customerId || 'cst-walkin',
            partyName: newSale.customerName || 'Walk-in Customer',
            date: newSale.date || nowIso,
            amount: newSale.paidAmount,
            accountId: newSale.accountId || 'acc-cash',
            paymentMethod: newSale.paymentMethod || 'CASH',
            reference: newSale.invoiceNo,
            notes: `POS sale payment for invoice #${newSale.invoiceNo}`,
            createdAt: serverTimestamp(),
          });
        }
      });

      return newSale;
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `sales/${saleId}`);
    }
  },

  async voidSale(id: string, reason: string): Promise<Sale> {
    try {
      await updateDoc(doc(db, 'sales', id), {
        status: 'Voided',
        voidReason: reason,
        updatedAt: serverTimestamp(),
      });
      const updated = await this.getSale(id);
      return updated!;
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `sales/${id}`);
    }
  },
};
