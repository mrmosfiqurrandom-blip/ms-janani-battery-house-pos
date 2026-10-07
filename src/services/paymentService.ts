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
import { CustomerPayment, SupplierPayment, Payment } from '../types';

export const paymentService = {
  subscribeCustomerPayments(
    callback: (payments: CustomerPayment[]) => void,
    onError?: (error: Error) => void
  ) {
    const q = query(collection(db, 'customerPayments'), orderBy('date', 'desc'));
    return onSnapshot(
      q,
      (snapshot) => {
        const list = snapshot.docs.map((d) => ({
          id: d.id,
          ...(d.data() as any),
        })) as CustomerPayment[];
        callback(list);
      },
      (error) => {
        console.error('Customer payments listener error:', error);
        if (onError) onError(error);
      }
    );
  },

  async getCustomerPayments(): Promise<CustomerPayment[]> {
    try {
      const snap = await getDocs(query(collection(db, 'customerPayments'), orderBy('date', 'desc')));
      return snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as CustomerPayment[];
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'customerPayments');
    }
  },

  /**
   * Customer payment:
   * 1. Records payment in `payments` and `customerPayments`
   * 2. Automatically updates customer due: `currentDue = Math.max(0, currentDue - amount)` & `totalPaid += amount`
   * 3. Increases receiving account balance
   */
  async createCustomerPayment(
    data: Omit<CustomerPayment, 'id' | 'paymentNo' | 'createdAt'>
  ): Promise<CustomerPayment> {
    const paymentId = `cpm-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const paymentNo = `RCP-${Date.now().toString().slice(-6)}`;
    const nowIso = new Date().toISOString();
    const newPayment: CustomerPayment = {
      ...data,
      id: paymentId,
      paymentNo,
      createdAt: nowIso,
    };

    try {
      await runTransaction(db, async (tx) => {
        // Reads
        const custRef = doc(db, 'customers', data.customerId);
        const custSnap = await tx.get(custRef);
        const custData = custSnap.exists() ? custSnap.data() : null;

        let accRef: any = null;
        let accData: any = null;
        if (data.accountId) {
          accRef = doc(db, 'accounts', data.accountId);
          const aSnap = await tx.get(accRef);
          if (aSnap.exists()) accData = aSnap.data();
        }

        // Writes: customerPayments collection
        const cpmRef = doc(db, 'customerPayments', paymentId);
        tx.set(cpmRef, {
          ...newPayment,
          createdAt: serverTimestamp(),
        });

        // Writes: payments collection
        const payRef = doc(db, 'payments', paymentId);
        tx.set(payRef, {
          id: paymentId,
          paymentNo,
          type: 'CUSTOMER',
          partyId: data.customerId,
          partyName: data.customerName,
          date: data.date || nowIso,
          amount: data.amount,
          accountId: data.accountId,
          paymentMethod: data.paymentMethod,
          reference: data.reference || '',
          notes: data.notes || '',
          createdAt: serverTimestamp(),
        });

        // Customer due automatically updated
        if (custRef && custData) {
          const currentDue = custData.currentDue || 0;
          const totalPaid = custData.totalPaid || 0;
          tx.update(custRef, {
            currentDue: Math.max(0, currentDue - data.amount),
            totalPaid: totalPaid + data.amount,
            updatedAt: serverTimestamp(),
          });
        }

        // Account balance increment
        if (accRef && accData) {
          const balance = accData.balance || 0;
          tx.update(accRef, {
            balance: balance + data.amount,
            updatedAt: serverTimestamp(),
          });
        }
      });

      return newPayment;
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `customerPayments/${paymentId}`);
    }
  },

  subscribeSupplierPayments(
    callback: (payments: SupplierPayment[]) => void,
    onError?: (error: Error) => void
  ) {
    const q = query(collection(db, 'supplierPayments'), orderBy('date', 'desc'));
    return onSnapshot(
      q,
      (snapshot) => {
        const list = snapshot.docs.map((d) => ({
          id: d.id,
          ...(d.data() as any),
        })) as SupplierPayment[];
        callback(list);
      },
      (error) => {
        console.error('Supplier payments listener error:', error);
        if (onError) onError(error);
      }
    );
  },

  async getSupplierPayments(): Promise<SupplierPayment[]> {
    try {
      const snap = await getDocs(query(collection(db, 'supplierPayments'), orderBy('date', 'desc')));
      return snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as SupplierPayment[];
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'supplierPayments');
    }
  },

  /**
   * Supplier payment:
   * 1. Records payment in `payments` and `supplierPayments`
   * 2. Automatically updates supplier payable: `currentDue = Math.max(0, currentDue - amount)` & `totalPaid += amount`
   * 3. Decreases account balance
   */
  async createSupplierPayment(
    data: Omit<SupplierPayment, 'id' | 'paymentNo' | 'createdAt'>
  ): Promise<SupplierPayment> {
    const paymentId = `spm-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const paymentNo = `DISB-${Date.now().toString().slice(-6)}`;
    const nowIso = new Date().toISOString();
    const newPayment: SupplierPayment = {
      ...data,
      id: paymentId,
      paymentNo,
      createdAt: nowIso,
    };

    try {
      await runTransaction(db, async (tx) => {
        const supRef = doc(db, 'suppliers', data.supplierId);
        const supSnap = await tx.get(supRef);
        const supData = supSnap.exists() ? supSnap.data() : null;

        let accRef: any = null;
        let accData: any = null;
        if (data.accountId) {
          accRef = doc(db, 'accounts', data.accountId);
          const aSnap = await tx.get(accRef);
          if (aSnap.exists()) accData = aSnap.data();
        }

        // Writes: supplierPayments
        const spmRef = doc(db, 'supplierPayments', paymentId);
        tx.set(spmRef, {
          ...newPayment,
          createdAt: serverTimestamp(),
        });

        // Writes: payments
        const payRef = doc(db, 'payments', paymentId);
        tx.set(payRef, {
          id: paymentId,
          paymentNo,
          type: 'SUPPLIER',
          partyId: data.supplierId,
          partyName: data.supplierName,
          date: data.date || nowIso,
          amount: data.amount,
          accountId: data.accountId,
          paymentMethod: data.paymentMethod,
          reference: data.reference || '',
          notes: data.notes || '',
          createdAt: serverTimestamp(),
        });

        // Supplier due updated
        if (supRef && supData) {
          const currentDue = supData.currentDue || 0;
          const totalPaid = supData.totalPaid || 0;
          tx.update(supRef, {
            currentDue: Math.max(0, currentDue - data.amount),
            totalPaid: totalPaid + data.amount,
            updatedAt: serverTimestamp(),
          });
        }

        // Deduct from paying account
        if (accRef && accData) {
          const balance = accData.balance || 0;
          tx.update(accRef, {
            balance: Math.max(0, balance - data.amount),
            updatedAt: serverTimestamp(),
          });
        }
      });

      return newPayment;
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `supplierPayments/${paymentId}`);
    }
  },
};
