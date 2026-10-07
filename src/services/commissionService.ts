import {
  collection,
  getDocs,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { SupplierCommission, CommissionStatus, PaymentMethod } from '../types';

export const commissionService = {
  subscribeCommissions(
    callback: (commissions: SupplierCommission[]) => void,
    onError?: (error: Error) => void
  ) {
    const q = query(collection(db, 'supplierCommissions'), orderBy('periodStart', 'desc'));
    return onSnapshot(
      q,
      (snapshot) => {
        const list = snapshot.docs.map((d) => ({
          id: d.id,
          ...(d.data() as any),
        })) as SupplierCommission[];
        callback(list);
      },
      (error) => {
        console.error('Commissions listener error:', error);
        if (onError) onError(error);
      }
    );
  },

  async getCommissions(): Promise<SupplierCommission[]> {
    try {
      const snap = await getDocs(query(collection(db, 'supplierCommissions'), orderBy('periodStart', 'desc')));
      return snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as SupplierCommission[];
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'supplierCommissions');
    }
  },

  async getCommission(id: string): Promise<SupplierCommission | undefined> {
    try {
      const snap = await getDoc(doc(db, 'supplierCommissions', id));
      if (snap.exists()) {
        return { id: snap.id, ...(snap.data() as any) } as SupplierCommission;
      }
      return undefined;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, `supplierCommissions/${id}`);
    }
  },

  async createCommission(
    data: Omit<SupplierCommission, 'id' | 'commissionAmount' | 'dueAmount' | 'status'>
  ): Promise<SupplierCommission> {
    const id = `com-${Date.now()}`;
    const commissionAmount = (data.eligiblePurchaseAmount * data.commissionRate) / 100;
    const receivedAmount = data.receivedAmount || 0;
    const dueAmount = Math.max(0, commissionAmount - receivedAmount);
    const status: CommissionStatus =
      dueAmount === 0 ? 'RECEIVED' : receivedAmount > 0 ? 'PARTIAL' : 'PENDING';

    const newCommission: SupplierCommission = {
      ...data,
      id,
      commissionAmount,
      receivedAmount,
      dueAmount,
      status,
    };

    try {
      await setDoc(doc(db, 'supplierCommissions', id), {
        ...newCommission,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      return newCommission;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `supplierCommissions/${id}`);
    }
  },

  async recordPayment(
    id: string,
    payment: { amount: number; paymentDate: string; paymentMethod: PaymentMethod; reference?: string }
  ): Promise<SupplierCommission> {
    const item = await this.getCommission(id);
    if (!item) throw new Error('Commission not found');

    const newReceived = item.receivedAmount + payment.amount;
    const newDue = Math.max(0, item.commissionAmount - newReceived);
    const newStatus: CommissionStatus = newDue === 0 ? 'RECEIVED' : 'PARTIAL';

    const updates = {
      receivedAmount: newReceived,
      dueAmount: newDue,
      status: newStatus,
      paymentDate: payment.paymentDate,
      paymentMethod: payment.paymentMethod,
      reference: payment.reference || '',
      updatedAt: serverTimestamp(),
    };

    try {
      await updateDoc(doc(db, 'supplierCommissions', id), updates);
      return { ...item, ...updates } as SupplierCommission;
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `supplierCommissions/${id}`);
    }
  },

  async getSummary(): Promise<{
    totalEarned: number;
    totalReceived: number;
    totalDue: number;
  }> {
    try {
      const list = await this.getCommissions();
      const active = list.filter((c) => c.status !== 'CANCELLED');
      const totalEarned = active.reduce((acc, c) => acc + c.commissionAmount, 0);
      const totalReceived = active.reduce((acc, c) => acc + c.receivedAmount, 0);
      const totalDue = active.reduce((acc, c) => acc + c.dueAmount, 0);

      return {
        totalEarned,
        totalReceived,
        totalDue,
      };
    } catch {
      return { totalEarned: 0, totalReceived: 0, totalDue: 0 };
    }
  },
};
