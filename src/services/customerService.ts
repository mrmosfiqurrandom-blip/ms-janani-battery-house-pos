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
import { Customer } from '../types';

export const customerService = {
  subscribeCustomers(
    callback: (customers: Customer[]) => void,
    onError?: (error: Error) => void
  ) {
    const q = query(collection(db, 'customers'), orderBy('name', 'asc'));
    return onSnapshot(
      q,
      (snapshot) => {
        const customers = snapshot.docs.map((d) => ({
          id: d.id,
          ...(d.data() as any),
        })) as Customer[];
        callback(customers);
      },
      (error) => {
        console.error('Customers listener error:', error);
        if (onError) onError(error);
      }
    );
  },

  async getCustomers(): Promise<Customer[]> {
    try {
      const snap = await getDocs(query(collection(db, 'customers'), orderBy('name', 'asc')));
      return snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as Customer[];
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'customers');
    }
  },

  async getCustomer(id: string): Promise<Customer | undefined> {
    try {
      const snap = await getDoc(doc(db, 'customers', id));
      if (snap.exists()) {
        return { id: snap.id, ...(snap.data() as any) } as Customer;
      }
      return undefined;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, `customers/${id}`);
    }
  },

  async createCustomer(
    customer: Omit<Customer, 'id' | 'createdAt' | 'currentDue' | 'totalPurchased' | 'totalPaid'>
  ): Promise<Customer> {
    const id = `cst-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const newCust: Customer = {
      ...customer,
      id,
      currentDue: customer.openingBalance || 0,
      totalPurchased: 0,
      totalPaid: 0,
      createdAt: new Date().toISOString(),
    };

    try {
      await setDoc(doc(db, 'customers', id), {
        ...newCust,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      return newCust;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `customers/${id}`);
    }
  },

  async updateCustomer(id: string, updates: Partial<Customer>): Promise<Customer> {
    try {
      await updateDoc(doc(db, 'customers', id), {
        ...updates,
        updatedAt: serverTimestamp(),
      });
      const updated = await this.getCustomer(id);
      return updated!;
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `customers/${id}`);
    }
  },
};
