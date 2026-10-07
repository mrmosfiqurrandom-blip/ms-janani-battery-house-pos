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
import { OldBatteryStock, OldBatteryStatus } from '../types';

export const oldBatteryService = {
  subscribeOldBatteries(
    callback: (batteries: OldBatteryStock[]) => void,
    status?: OldBatteryStatus | 'ALL',
    onError?: (error: Error) => void
  ) {
    const q = query(collection(db, 'oldBatteryStock'), orderBy('buybackDate', 'desc'));
    return onSnapshot(
      q,
      (snapshot) => {
        let list = snapshot.docs.map((d) => ({
          id: d.id,
          ...(d.data() as any),
        })) as OldBatteryStock[];

        if (status && status !== 'ALL') {
          list = list.filter((b) => b.status === status);
        }
        callback(list);
      },
      (error) => {
        console.error('Old batteries listener error:', error);
        if (onError) onError(error);
      }
    );
  },

  async getOldBatteries(status?: OldBatteryStatus | 'ALL'): Promise<OldBatteryStock[]> {
    try {
      const snap = await getDocs(query(collection(db, 'oldBatteryStock'), orderBy('buybackDate', 'desc')));
      let list = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as OldBatteryStock[];

      if (status && status !== 'ALL') {
        list = list.filter((b) => b.status === status);
      }
      return list;
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'oldBatteryStock');
    }
  },

  async addOldBattery(item: Omit<OldBatteryStock, 'id' | 'code'>): Promise<OldBatteryStock> {
    const id = `obs-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const code = `OB-2026-${Math.floor(100 + Math.random() * 900)}`;
    const newBattery: OldBatteryStock = { ...item, id, code };

    try {
      // Write to both oldBatteryStock and buyback_records for schema completeness
      await setDoc(doc(db, 'oldBatteryStock', id), {
        ...newBattery,
        createdAt: serverTimestamp(),
      });

      await setDoc(doc(db, 'buyback_records', id), {
        id,
        invoiceNo: item.sourceInvoiceNo || '',
        customerId: item.sourceCustomerId || '',
        customerName: item.sourceCustomerName || '',
        batteryType: item.type,
        brand: item.brand,
        capacityAh: item.capacityAh,
        condition: 'SCRAP',
        quantity: 1,
        unitPrice: item.buybackPrice,
        totalAmount: item.buybackPrice,
        status: item.status || 'IN_STOCK',
        date: item.buybackDate,
        createdAt: serverTimestamp(),
      });

      return newBattery;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `oldBatteryStock/${id}`);
    }
  },

  async recordSaleOrScrap(
    id: string,
    payload: { saleDisposalDate: string; saleDisposalValue: number; status: OldBatteryStatus; notes?: string }
  ): Promise<OldBatteryStock> {
    try {
      const existingDoc = await getDoc(doc(db, 'oldBatteryStock', id));
      if (!existingDoc.exists()) throw new Error('Old battery record not found');
      const item = existingDoc.data() as OldBatteryStock;

      const profitLoss = payload.saleDisposalValue - item.buybackPrice;
      const updates = {
        status: payload.status,
        saleDisposalDate: payload.saleDisposalDate,
        saleDisposalValue: payload.saleDisposalValue,
        profitLoss,
        notes: payload.notes || item.notes,
        updatedAt: serverTimestamp(),
      };

      await updateDoc(doc(db, 'oldBatteryStock', id), updates);

      // Also update in buyback_records if exists
      try {
        await updateDoc(doc(db, 'buyback_records', id), {
          status: payload.status,
          updatedAt: serverTimestamp(),
        });
      } catch {
        // buyback_records update optional
      }

      return {
        ...item,
        id,
        ...updates,
      };
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `oldBatteryStock/${id}`);
    }
  },

  async getSummary(): Promise<{
    inStockCount: number;
    totalBuybackCost: number;
    soldValueTotal: number;
    totalProfitLoss: number;
  }> {
    try {
      const list = await this.getOldBatteries();
      const inStock = list.filter((b) => b.status === 'IN_STOCK');
      const disposed = list.filter((b) => b.status === 'SOLD' || b.status === 'SCRAPPED');
      return {
        inStockCount: inStock.length,
        totalBuybackCost: inStock.reduce((acc, b) => acc + (b.buybackPrice || 0), 0),
        soldValueTotal: disposed.reduce((acc, b) => acc + (b.saleDisposalValue || 0), 0),
        totalProfitLoss: disposed.reduce((acc, b) => acc + (b.profitLoss || 0), 0),
      };
    } catch {
      return { inStockCount: 0, totalBuybackCost: 0, soldValueTotal: 0, totalProfitLoss: 0 };
    }
  },
};
