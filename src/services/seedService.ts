import { doc, setDoc, getDocs, collection, serverTimestamp, writeBatch } from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../lib/firebase';
import {
  mockProducts,
  mockBrands,
  mockCategories,
  mockUnits,
  mockCustomers,
  mockSuppliers,
  mockAccounts,
  mockSales,
  mockPurchases,
  mockOldBatteries,
  mockSupplierCommissions,
  mockExpenses,
  mockSettings,
} from '../data/mockData';

export const seedService = {
  async isDatabaseSeeded(): Promise<boolean> {
    try {
      const snap = await getDocs(collection(db, 'products'));
      return !snap.empty;
    } catch {
      return false;
    }
  },

  async seedAllData(currentUserEmail?: string | null): Promise<{ success: boolean; message: string }> {
    const currentAuthUser = auth.currentUser;
    try {
      // 1. Ensure current user document is ADMIN in `users` collection if signed in
      if (currentAuthUser) {
        await setDoc(doc(db, 'users', currentAuthUser.uid), {
          id: currentAuthUser.uid,
          uid: currentAuthUser.uid,
          name: currentAuthUser.displayName || 'Primary Administrator',
          email: currentAuthUser.email || currentUserEmail || 'admin@janani.com',
          role: 'admin',
          status: 'ACTIVE',
          active: true,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }

      // Seed sample users with distinct roles: admin, manager, cashier
      const sampleStaff = [
        { id: 'usr-admin', name: 'Master Administrator', email: 'admin@janani.com', role: 'admin' },
        { id: 'usr-manager', name: 'Inventory Manager', email: 'manager@janani.com', role: 'manager' },
        { id: 'usr-cashier', name: 'Counter Cashier', email: 'cashier@janani.com', role: 'cashier' },
      ];
      for (const staff of sampleStaff) {
        await setDoc(doc(db, 'users', staff.id), {
          ...staff,
          active: true,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }

      // 2. Categories, Brands, Units
      for (const cat of mockCategories) {
        await setDoc(doc(db, 'categories', cat.id), {
          ...cat,
          createdAt: serverTimestamp(),
        });
      }
      for (const b of mockBrands) {
        await setDoc(doc(db, 'brands', b.id), b);
      }
      for (const u of mockUnits) {
        await setDoc(doc(db, 'units', u.id), u);
      }

      // 3. Products
      for (const p of mockProducts) {
        await setDoc(doc(db, 'products', p.id), {
          ...p,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });

        // Add opening stock movement
        const movId = `sm-open-${p.id}`;
        await setDoc(doc(db, 'stock_movements', movId), {
          id: movId,
          date: '2026-10-01T08:00:00Z',
          productId: p.id,
          productName: p.name,
          sku: p.sku,
          type: 'OPENING',
          quantityIn: p.currentStock,
          quantityOut: 0,
          balance: p.currentStock,
          reference: 'OPENING_STOCK',
          notes: 'Initial inventory bootstrap',
          createdAt: serverTimestamp(),
        });
      }

      // 4. Customers
      for (const c of mockCustomers) {
        await setDoc(doc(db, 'customers', c.id), {
          ...c,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }

      // 5. Suppliers
      for (const s of mockSuppliers) {
        await setDoc(doc(db, 'suppliers', s.id), {
          ...s,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }

      // 6. Accounts
      for (const a of mockAccounts) {
        await setDoc(doc(db, 'accounts', a.id), {
          ...a,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }

      // 7. Sales & sale_items
      for (const sal of mockSales) {
        await setDoc(doc(db, 'sales', sal.id), {
          ...sal,
          createdAt: serverTimestamp(),
        });

        // Add to sale_items
        for (let i = 0; i < sal.items.length; i++) {
          const item = sal.items[i];
          const itemId = `${sal.id}-item-${i + 1}`;
          await setDoc(doc(db, 'sale_items', itemId), {
            id: itemId,
            saleId: sal.id,
            invoiceNo: sal.invoiceNo,
            productId: item.productId,
            productName: item.productName,
            sku: item.sku,
            unit: item.unit,
            unitPrice: item.unitPrice,
            quantity: item.quantity,
            total: item.total,
            createdAt: serverTimestamp(),
          });
        }
      }

      // 8. Purchases & purchase_items
      for (const pur of mockPurchases) {
        await setDoc(doc(db, 'purchases', pur.id), {
          ...pur,
          createdAt: serverTimestamp(),
        });

        for (let i = 0; i < pur.items.length; i++) {
          const item = pur.items[i];
          const itemId = `${pur.id}-item-${i + 1}`;
          await setDoc(doc(db, 'purchase_items', itemId), {
            id: itemId,
            purchaseId: pur.id,
            purchaseNo: pur.purchaseNo,
            productId: item.productId,
            productName: item.productName,
            unit: item.unit,
            quantity: item.quantity,
            purchaseCost: item.purchaseCost,
            total: item.total,
            createdAt: serverTimestamp(),
          });
        }
      }

      // 9. Returns (sales_returns & purchase_returns)
      const sampleSaleReturn = {
        id: 'sr-sample-1',
        returnNo: 'SR-000101',
        saleInvoiceNo: 'VP-INV-1044',
        date: '2026-10-06T16:00:00Z',
        customerId: 'cst-1',
        customerName: 'Md. Shafiqul Rahman',
        productId: 'prd-1',
        productName: 'Hamko 12V 100Ah Deep Cycle IPS Battery',
        quantity: 1,
        refundAmount: 20000,
        accountId: 'acc-1',
        reason: 'Client requested 150Ah upgrade instead',
        status: 'COMPLETED',
      };
      await setDoc(doc(db, 'sales_returns', sampleSaleReturn.id), {
        ...sampleSaleReturn,
        createdAt: serverTimestamp(),
      });

      const samplePurReturn = {
        id: 'pr-sample-1',
        returnNo: 'PR-000051',
        purchaseInvoiceNo: 'VP-PUR-8821',
        date: '2026-10-05T11:00:00Z',
        supplierId: 'sup-1',
        supplierName: 'Rahimafrooz Globatt Ltd',
        productId: 'prd-2',
        productName: 'Rahimafrooz Tubular Battery 150Ah',
        quantity: 1,
        returnAmount: 24000,
        reason: 'Factory terminal bent in transit',
        status: 'COMPLETED',
      };
      await setDoc(doc(db, 'purchase_returns', samplePurReturn.id), {
        ...samplePurReturn,
        createdAt: serverTimestamp(),
      });

      // 10. Buyback records (buyback_records & oldBatteryStock)
      for (const ob of mockOldBatteries) {
        await setDoc(doc(db, 'oldBatteryStock', ob.id), {
          ...ob,
          createdAt: serverTimestamp(),
        });

        await setDoc(doc(db, 'buyback_records', ob.id), {
          id: ob.id,
          invoiceNo: ob.sourceInvoiceNo || '',
          customerId: ob.sourceCustomerId || '',
          customerName: ob.sourceCustomerName || '',
          batteryType: ob.type,
          brand: ob.brand,
          capacityAh: ob.capacityAh,
          condition: 'SCRAP',
          quantity: 1,
          unitPrice: ob.buybackPrice,
          totalAmount: ob.buybackPrice,
          status: ob.status || 'IN_STOCK',
          date: ob.buybackDate,
          createdAt: serverTimestamp(),
        });
      }

      // 11. Payments collection (both customer & supplier payments)
      const samplePayments = [
        {
          id: 'pay-sample-1',
          paymentNo: 'RCP-1044',
          type: 'CUSTOMER',
          partyId: 'cst-1',
          partyName: 'Md. Shafiqul Rahman',
          date: '2026-10-06T15:30:00Z',
          amount: 15000,
          accountId: 'acc-1',
          paymentMethod: 'CASH',
          reference: 'VP-INV-1044',
          notes: 'Counter settlement',
        },
        {
          id: 'pay-sample-2',
          paymentNo: 'DISB-8821',
          type: 'SUPPLIER',
          partyId: 'sup-1',
          partyName: 'Rahimafrooz Globatt Ltd',
          date: '2026-10-03T12:00:00Z',
          amount: 250000,
          accountId: 'acc-2',
          paymentMethod: 'BANK',
          reference: 'CHQ-992144',
          notes: 'Bank cheque payment',
        },
      ];
      for (const pay of samplePayments) {
        await setDoc(doc(db, 'payments', pay.id), {
          ...pay,
          createdAt: serverTimestamp(),
        });
        if (pay.type === 'CUSTOMER') {
          await setDoc(doc(db, 'customerPayments', pay.id), {
            id: pay.id,
            paymentNo: pay.paymentNo,
            customerId: pay.partyId,
            customerName: pay.partyName,
            date: pay.date,
            amount: pay.amount,
            accountId: pay.accountId,
            paymentMethod: pay.paymentMethod,
            reference: pay.reference,
            notes: pay.notes,
            createdAt: serverTimestamp(),
          });
        } else {
          await setDoc(doc(db, 'supplierPayments', pay.id), {
            id: pay.id,
            paymentNo: pay.paymentNo,
            supplierId: pay.partyId,
            supplierName: pay.partyName,
            date: pay.date,
            amount: pay.amount,
            accountId: pay.accountId,
            paymentMethod: pay.paymentMethod,
            reference: pay.reference,
            notes: pay.notes,
            createdAt: serverTimestamp(),
          });
        }
      }

      // 12. Expenses
      for (const exp of mockExpenses) {
        await setDoc(doc(db, 'expenses', exp.id), {
          ...exp,
          createdAt: serverTimestamp(),
        });
      }

      // 13. Settings
      await setDoc(doc(db, 'settings', 'general'), {
        ...mockSettings,
        updatedAt: serverTimestamp(),
      });

      return {
        success: true,
        message: 'Successfully populated all 16 collections in Firestore with sample data, products, ledger records & test sales!',
      };
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'seedDatabase');
    }
  },
};
