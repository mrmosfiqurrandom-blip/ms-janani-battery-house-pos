import {
  collection,
  getDocs,
  doc,
  setDoc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { StockMovement, StockMovementType } from '../types';

export const inventoryService = {
  subscribeStockMovements(
    callback: (movements: StockMovement[]) => void,
    filters?: { productId?: string; type?: StockMovementType },
    onError?: (error: Error) => void
  ) {
    const q = query(collection(db, 'stock_movements'), orderBy('date', 'desc'));
    return onSnapshot(
      q,
      (snapshot) => {
        let list = snapshot.docs.map((d) => ({
          id: d.id,
          ...(d.data() as any),
        })) as StockMovement[];

        if (filters?.productId) {
          list = list.filter((m) => m.productId === filters.productId);
        }
        if (filters?.type) {
          list = list.filter((m) => m.type === filters.type);
        }
        callback(list);
      },
      (error) => {
        console.error('Stock movements listener error:', error);
        if (onError) onError(error);
      }
    );
  },

  async getStockMovements(filters?: { productId?: string; type?: StockMovementType }): Promise<StockMovement[]> {
    try {
      const snap = await getDocs(query(collection(db, 'stock_movements'), orderBy('date', 'desc')));
      let list = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as StockMovement[];

      if (filters?.productId) {
        list = list.filter((m) => m.productId === filters.productId);
      }
      if (filters?.type) {
        list = list.filter((m) => m.type === filters.type);
      }
      return list;
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'stock_movements');
    }
  },

  async recordMovement(data: Omit<StockMovement, 'id'>): Promise<StockMovement> {
    const id = `sm-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const newMovement: StockMovement = {
      ...data,
      id,
    };

    try {
      await setDoc(doc(db, 'stock_movements', id), {
        ...newMovement,
        createdAt: serverTimestamp(),
      });
      return newMovement;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `stock_movements/${id}`);
    }
  },
};
