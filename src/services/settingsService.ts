import { doc, getDoc, setDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { ShopSettings } from '../types';

export const defaultSettings: ShopSettings = {
  shopName: 'VoltPulse Battery & Power Solutions',
  tagline: 'Leading Distributor of Industrial Batteries & Solar Solutions',
  address: 'Shop 12-14, Green Super Market, Mirpur-10, Dhaka-1216',
  phone: '+880 1711-223344 / +880 1911-556677',
  email: 'sales@voltpulse.com.bd',
  website: 'www.voltpulse.com.bd',
  invoiceFooter: 'Thank you for your business! Goods once sold cannot be returned without original receipt. 18-month warranty on Hamko & Rahimafrooz batteries.',
  invoicePrefix: 'VP-INV-',
  invoiceStartingNumber: 1045,
  showLogoOnInvoice: true,
  showCustomerAddress: true,
  receiptSize: 'POS_80MM',
  currency: 'BDT',
  currencySymbol: '৳',
  enableTax: false,
  defaultTaxRate: 5,
  lowStockThreshold: 5,
  barcodeAutoPrint: false,
};

export const settingsService = {
  subscribeSettings(
    callback: (settings: ShopSettings) => void,
    onError?: (error: Error) => void
  ) {
    return onSnapshot(
      doc(db, 'settings', 'general'),
      (snap) => {
        if (snap.exists()) {
          callback({ ...defaultSettings, ...(snap.data() as any) });
        } else {
          callback(defaultSettings);
        }
      },
      (error) => {
        console.error('Settings listener error:', error);
        if (onError) onError(error);
      }
    );
  },

  async getSettings(): Promise<ShopSettings> {
    try {
      const snap = await getDoc(doc(db, 'settings', 'general'));
      if (snap.exists()) {
        return { ...defaultSettings, ...(snap.data() as any) };
      }
      return defaultSettings;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, 'settings/general');
    }
  },

  async updateSettings(updates: Partial<ShopSettings>): Promise<ShopSettings> {
    try {
      const current = await this.getSettings();
      const merged: ShopSettings = { ...current, ...updates };
      await setDoc(doc(db, 'settings', 'general'), {
        ...merged,
        updatedAt: serverTimestamp(),
      });
      return merged;
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'settings/general');
    }
  },
};
