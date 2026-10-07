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
import { Expense, ExpenseCategory } from '../types';

export const expenseService = {
  subscribeExpenses(
    callback: (expenses: Expense[]) => void,
    category?: ExpenseCategory | 'ALL',
    onError?: (error: Error) => void
  ) {
    const q = query(collection(db, 'expenses'), orderBy('date', 'desc'));
    return onSnapshot(
      q,
      (snapshot) => {
        let list = snapshot.docs.map((d) => ({
          id: d.id,
          ...(d.data() as any),
        })) as Expense[];

        if (category && category !== 'ALL') {
          list = list.filter((e) => e.category === category);
        }
        callback(list);
      },
      (error) => {
        console.error('Expenses listener error:', error);
        if (onError) onError(error);
      }
    );
  },

  async getExpenses(category?: ExpenseCategory | 'ALL'): Promise<Expense[]> {
    try {
      const snap = await getDocs(query(collection(db, 'expenses'), orderBy('date', 'desc')));
      let list = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as Expense[];

      if (category && category !== 'ALL') {
        return list.filter((e) => e.category === category);
      }
      return list;
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'expenses');
    }
  },

  async createExpense(data: Omit<Expense, 'id' | 'expenseNo' | 'createdAt'>): Promise<Expense> {
    const id = `exp-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const expenseNo = `EXP-${Date.now().toString().slice(-6)}`;
    const nowIso = new Date().toISOString();
    const newExp: Expense = {
      ...data,
      id,
      expenseNo,
      createdAt: nowIso,
    };

    try {
      await runTransaction(db, async (tx) => {
        let accRef: any = null;
        let accData: any = null;
        if (data.accountId) {
          accRef = doc(db, 'accounts', data.accountId);
          const aSnap = await tx.get(accRef);
          if (aSnap.exists()) accData = aSnap.data();
        }

        const expRef = doc(db, 'expenses', id);
        tx.set(expRef, {
          ...newExp,
          createdAt: serverTimestamp(),
        });

        // Deduct from account balance if account specified
        if (accRef && accData) {
          const balance = accData.balance || 0;
          tx.update(accRef, {
            balance: Math.max(0, balance - data.amount),
            updatedAt: serverTimestamp(),
          });
        }
      });

      return newExp;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `expenses/${id}`);
    }
  },

  async getTotalExpenses(): Promise<number> {
    const exps = await this.getExpenses();
    return exps.reduce((sum, item) => sum + item.amount, 0);
  },
};
