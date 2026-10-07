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
import { Account, AccountTransfer, AccountTransaction } from '../types';

export const accountService = {
  subscribeAccounts(
    callback: (accounts: Account[]) => void,
    onError?: (error: Error) => void
  ) {
    const q = query(collection(db, 'accounts'), orderBy('name', 'asc'));
    return onSnapshot(
      q,
      (snapshot) => {
        const accounts = snapshot.docs.map((d) => ({
          id: d.id,
          ...(d.data() as any),
        })) as Account[];
        callback(accounts);
      },
      (error) => {
        console.error('Accounts listener error:', error);
        if (onError) onError(error);
      }
    );
  },

  async getAccounts(): Promise<Account[]> {
    try {
      const snap = await getDocs(query(collection(db, 'accounts'), orderBy('name', 'asc')));
      return snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as Account[];
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'accounts');
    }
  },

  async getAccount(id: string): Promise<Account | undefined> {
    try {
      const snap = await getDoc(doc(db, 'accounts', id));
      if (snap.exists()) {
        return { id: snap.id, ...(snap.data() as any) } as Account;
      }
      return undefined;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, `accounts/${id}`);
    }
  },

  async createAccount(account: Omit<Account, 'id' | 'totalIn' | 'totalOut'>): Promise<Account> {
    const id = `acc-${Date.now()}`;
    const newAcc: Account = {
      ...account,
      id,
      totalIn: account.balance || 0,
      totalOut: 0,
    };

    try {
      await setDoc(doc(db, 'accounts', id), {
        ...newAcc,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      return newAcc;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `accounts/${id}`);
    }
  },

  async updateAccount(id: string, updates: Partial<Account>): Promise<Account> {
    try {
      await updateDoc(doc(db, 'accounts', id), {
        ...updates,
        updatedAt: serverTimestamp(),
      });
      const updated = await this.getAccount(id);
      return updated!;
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `accounts/${id}`);
    }
  },

  async transferFunds(data: Omit<AccountTransfer, 'id' | 'transferNo' | 'createdAt'>): Promise<AccountTransfer> {
    const id = `trf-${Date.now()}`;
    const transferNo = `TRF-${Date.now().toString().slice(-6)}`;
    const nowIso = new Date().toISOString();
    const newTransfer: AccountTransfer = {
      ...data,
      id,
      transferNo,
      createdAt: nowIso,
    };

    try {
      await runTransaction(db, async (tx) => {
        const fromRef = doc(db, 'accounts', data.fromAccountId);
        const toRef = doc(db, 'accounts', data.toAccountId);

        const fromSnap = await tx.get(fromRef);
        const toSnap = await tx.get(toRef);

        if (!fromSnap.exists() || !toSnap.exists()) {
          throw new Error('One of the transfer accounts was not found');
        }

        const fromBal = fromSnap.data().balance || 0;
        const toBal = toSnap.data().balance || 0;

        tx.update(fromRef, {
          balance: Math.max(0, fromBal - data.amount),
          totalOut: (fromSnap.data().totalOut || 0) + data.amount,
          updatedAt: serverTimestamp(),
        });

        tx.update(toRef, {
          balance: toBal + data.amount,
          totalIn: (toSnap.data().totalIn || 0) + data.amount,
          updatedAt: serverTimestamp(),
        });

        tx.set(doc(db, 'accountTransfers', id), {
          ...newTransfer,
          createdAt: serverTimestamp(),
        });
      });

      return newTransfer;
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `accountTransfers/${id}`);
    }
  },

  async createTransfer(data: Omit<AccountTransfer, 'id' | 'transferNo' | 'createdAt'>): Promise<AccountTransfer> {
    return this.transferFunds(data);
  },

  async getTransfers(): Promise<AccountTransfer[]> {
    try {
      const snap = await getDocs(query(collection(db, 'accountTransfers'), orderBy('date', 'desc')));
      return snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as AccountTransfer[];
    } catch {
      return [];
    }
  },

  async getTransactions(accountId?: string): Promise<AccountTransaction[]> {
    try {
      const snap = await getDocs(query(collection(db, 'accountTransactions'), orderBy('date', 'desc')));
      let list = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as AccountTransaction[];
      if (accountId) {
        list = list.filter((t) => t.accountId === accountId);
      }
      return list;
    } catch {
      return [];
    }
  },
};
