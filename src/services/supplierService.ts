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
import { Supplier } from '../types';

export const supplierService = {
  subscribeSuppliers(
    callback: (suppliers: Supplier[]) => void,
    onError?: (error: Error) => void
  ) {
    const q = query(collection(db, 'suppliers'), orderBy('name', 'asc'));
    return onSnapshot(
      q,
      (snapshot) => {
        const suppliers = snapshot.docs.map((d) => ({
          id: d.id,
          ...(d.data() as any),
        })) as Supplier[];
        callback(suppliers);
      },
      (error) => {
        console.error('Suppliers listener error:', error);
        if (onError) onError(error);
      }
    );
  },

  async getSuppliers(): Promise<Supplier[]> {
    try {
      const snap = await getDocs(query(collection(db, 'suppliers'), orderBy('name', 'asc')));
      return snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as Supplier[];
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'suppliers');
    }
  },

  async getSupplier(id: string): Promise<Supplier | undefined> {
    try {
      const snap = await getDoc(doc(db, 'suppliers', id));
      if (snap.exists()) {
        return { id: snap.id, ...(snap.data() as any) } as Supplier;
      }
      return undefined;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, `suppliers/${id}`);
    }
  },

  async createSupplier(
    supplier: Omit<Supplier, 'id' | 'createdAt' | 'currentDue' | 'totalPurchased' | 'totalPaid'>
  ): Promise<Supplier> {
    const id = `sup-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const newSup: Supplier = {
      ...supplier,
      id,
      currentDue: supplier.openingBalance || 0,
      totalPurchased: 0,
      totalPaid: 0,
      commissionEarnedTotal: 0,
      commissionDueTotal: 0,
      createdAt: new Date().toISOString(),
    };

    try {
      await setDoc(doc(db, 'suppliers', id), {
        ...newSup,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      return newSup;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `suppliers/${id}`);
    }
  },

  async updateSupplier(id: string, updates: Partial<Supplier>): Promise<Supplier> {
    try {
      await updateDoc(doc(db, 'suppliers', id), {
        ...updates,
        updatedAt: serverTimestamp(),
      });
      const updated = await this.getSupplier(id);
      return updated!;
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `suppliers/${id}`);
    }
  },
};
