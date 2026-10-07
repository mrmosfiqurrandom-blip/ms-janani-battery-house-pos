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
import { Purchase } from '../types';

export const purchaseService = {
  subscribePurchases(
    callback: (purchases: Purchase[]) => void,
    onError?: (error: Error) => void
  ) {
    const q = query(collection(db, 'purchases'), orderBy('date', 'desc'));
    return onSnapshot(
      q,
      (snapshot) => {
        const purchases = snapshot.docs.map((d) => ({
          id: d.id,
          ...(d.data() as any),
        })) as Purchase[];
        callback(purchases);
      },
      (error) => {
        console.error('Purchases listener error:', error);
        if (onError) onError(error);
      }
    );
  },

  async getPurchases(): Promise<Purchase[]> {
    try {
      const snap = await getDocs(query(collection(db, 'purchases'), orderBy('date', 'desc')));
      return snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as Purchase[];
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'purchases');
    }
  },

  async getPurchase(id: string): Promise<Purchase | undefined> {
    try {
      const snap = await getDoc(doc(db, 'purchases', id));
      if (snap.exists()) {
        return { id: snap.id, ...(snap.data() as any) } as Purchase;
      }
      return undefined;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, `purchases/${id}`);
    }
  },

  /**
   * Atomic Purchase Execution:
   * 1. Writes purchase to `purchases/{purchaseId}`
   * 2. Writes line items to `purchase_items/{itemId}`
   * 3. Increments currentStock of each product and adds `stock_movements` entry
   * 4. Updates supplier currentDue on credit purchases (and totalPurchased & totalPaid)
   * 5. Updates account balance & creates `payments` record if paidAmount > 0
   */
  async createPurchase(data: Omit<Purchase, 'id' | 'createdAt'>): Promise<Purchase> {
    const purchaseId = `pur-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const nowIso = new Date().toISOString();
    const newPurchase: Purchase = {
      ...data,
      id: purchaseId,
      createdAt: nowIso,
    };

    try {
      await runTransaction(db, async (tx) => {
        // 1. Transaction reads
        const productSnapshots: { ref: any; data: any; item: any }[] = [];
        for (const item of newPurchase.items) {
          const pRef = doc(db, 'products', item.productId);
          const pSnap = await tx.get(pRef);
          productSnapshots.push({
            ref: pRef,
            data: pSnap.exists() ? pSnap.data() : null,
            item,
          });
        }

        let supRef: any = null;
        let supData: any = null;
        if (newPurchase.supplierId) {
          supRef = doc(db, 'suppliers', newPurchase.supplierId);
          const sSnap = await tx.get(supRef);
          if (sSnap.exists()) {
            supData = sSnap.data();
          }
        }

        let accRef: any = null;
        let accData: any = null;
        if (newPurchase.paidAmount > 0 && newPurchase.accountId) {
          accRef = doc(db, 'accounts', newPurchase.accountId);
          const aSnap = await tx.get(accRef);
          if (aSnap.exists()) {
            accData = aSnap.data();
          }
        }

        // 2. Transaction writes
        // Primary purchase record
        const purRef = doc(db, 'purchases', purchaseId);
        tx.set(purRef, {
          ...newPurchase,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });

        // Line items, stock increment, and stock_movements
        let itemIndex = 0;
        for (const pInfo of productSnapshots) {
          itemIndex++;
          const pItemId = `${purchaseId}-item-${itemIndex}`;
          const pItemRef = doc(db, 'purchase_items', pItemId);
          tx.set(pItemRef, {
            id: pItemId,
            purchaseId,
            purchaseNo: newPurchase.purchaseNo,
            productId: pInfo.item.productId,
            productName: pInfo.item.productName,
            unit: pInfo.item.unit || 'pcs',
            quantity: pInfo.item.quantity,
            purchaseCost: pInfo.item.purchaseCost,
            total: pInfo.item.total,
            createdAt: serverTimestamp(),
          });

          const currentStock = pInfo.data ? pInfo.data.currentStock || 0 : 0;
          const newStock = currentStock + pInfo.item.quantity;

          if (pInfo.data) {
            tx.update(pInfo.ref, {
              currentStock: newStock,
              purchasePrice: pInfo.item.purchaseCost || pInfo.data.purchasePrice,
              updatedAt: serverTimestamp(),
            });
          }

          const movId = `sm-pur-${Date.now()}-${itemIndex}-${Math.floor(Math.random() * 100)}`;
          const movRef = doc(db, 'stock_movements', movId);
          tx.set(movRef, {
            id: movId,
            date: newPurchase.date || nowIso,
            productId: pInfo.item.productId,
            productName: pInfo.item.productName,
            sku: pInfo.data?.sku || '',
            type: 'PURCHASE',
            quantityIn: pInfo.item.quantity,
            quantityOut: 0,
            balance: newStock,
            reference: newPurchase.purchaseNo,
            notes: `Supplier Purchase Order #${newPurchase.purchaseNo}`,
            createdAt: serverTimestamp(),
          });
        }

        // Supplier ledger update
        if (supRef && supData) {
          const currentDue = supData.currentDue || 0;
          const totalPurchased = supData.totalPurchased || 0;
          const totalPaid = supData.totalPaid || 0;

          const updatedDue = newPurchase.dueAmount > 0 ? currentDue + newPurchase.dueAmount : currentDue;
          const updatedPurchased = totalPurchased + (newPurchase.total || 0);
          const updatedPaid = totalPaid + (newPurchase.paidAmount || 0);

          tx.update(supRef, {
            currentDue: updatedDue,
            totalPurchased: updatedPurchased,
            totalPaid: updatedPaid,
            updatedAt: serverTimestamp(),
          });
        }

        // Account deduction and payment record if paid
        if (newPurchase.paidAmount > 0) {
          if (accRef && accData) {
            const accBalance = accData.balance || 0;
            tx.update(accRef, {
              balance: Math.max(0, accBalance - newPurchase.paidAmount),
              updatedAt: serverTimestamp(),
            });
          }

          const payId = `pay-pur-${Date.now()}-${Math.floor(Math.random() * 100)}`;
          const payRef = doc(db, 'payments', payId);
          tx.set(payRef, {
            id: payId,
            paymentNo: `DISB-${newPurchase.purchaseNo}`,
            type: 'SUPPLIER',
            partyId: newPurchase.supplierId,
            partyName: newPurchase.supplierName,
            date: newPurchase.date || nowIso,
            amount: newPurchase.paidAmount,
            accountId: newPurchase.accountId || 'acc-cash',
            paymentMethod: newPurchase.paymentMethod || 'CASH',
            reference: newPurchase.purchaseNo,
            notes: `Purchase disbursement for #${newPurchase.purchaseNo}`,
            createdAt: serverTimestamp(),
          });
        }
      });

      return newPurchase;
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `purchases/${purchaseId}`);
    }
  },

  async cancelPurchase(id: string): Promise<Purchase> {
    try {
      await updateDoc(doc(db, 'purchases', id), {
        status: 'CANCELLED',
        updatedAt: serverTimestamp(),
      });
      const p = await this.getPurchase(id);
      return p!;
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `purchases/${id}`);
    }
  },
};
