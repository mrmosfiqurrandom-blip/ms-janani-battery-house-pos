import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

admin.initializeApp();
const db = admin.firestore();

/**
 * 1. createSale: Atomic multi-document financial transaction
 */
export const createSale = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'User must be authenticated to process sales transactions.'
    );
  }

  const {
    invoiceNo,
    customerId,
    customerName,
    customerPhone,
    items,
    salesDiscount = 0,
    oldBatteryBuybacks = [],
    paidAmount = 0,
    paymentMethod = 'CASH',
    accountId,
    notes = '',
  } = data;

  if (!items || items.length === 0) {
    throw new functions.https.HttpsError('invalid-argument', 'Sale must contain at least one item.');
  }

  return await db.runTransaction(async (transaction) => {
    let grossSale = 0;
    const saleItemsSnapshots: any[] = [];

    // Validate and calculate products
    for (const item of items) {
      const prodRef = db.collection('products').doc(item.productId);
      const prodDoc = await transaction.get(prodRef);

      if (!prodDoc.exists) {
        throw new functions.https.HttpsError('not-found', `Product ${item.productName} not found.`);
      }

      const prodData = prodDoc.data()!;
      if (prodData.currentStock < item.quantity) {
        throw new functions.https.HttpsError(
          'failed-precondition',
          `Insufficient stock for ${prodData.name}. In stock: ${prodData.currentStock}, requested: ${item.quantity}`
        );
      }

      const lineTotal = item.quantity * prodData.sellingPrice;
      grossSale += lineTotal;

      saleItemsSnapshots.push({
        productId: item.productId,
        productNameSnapshot: prodData.name,
        skuSnapshot: prodData.sku,
        unit: prodData.unit || 'Piece',
        quantity: item.quantity,
        unitPrice: prodData.sellingPrice,
        costPriceSnapshot: prodData.purchasePrice,
        lineTotal,
      });

      // Update product stock atomically
      const newStock = prodData.currentStock - item.quantity;
      transaction.update(prodRef, {
        currentStock: newStock,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      // Log stock movement
      const moveRef = db.collection('stockMovements').doc();
      transaction.set(moveRef, {
        productId: item.productId,
        productName: prodData.name,
        sku: prodData.sku,
        type: 'SALE',
        quantityIn: 0,
        quantityOut: item.quantity,
        balanceAfter: newStock,
        referenceType: 'SALE_INVOICE',
        referenceId: invoiceNo,
        createdBy: context.auth!.uid,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }

    // Calculate Old Battery Buyback
    let oldBatteryBuybackAmount = 0;
    for (const obb of oldBatteryBuybacks) {
      const obbTotal = obb.quantity * obb.unitPrice;
      oldBatteryBuybackAmount += obbTotal;

      // Add to old battery stock pool
      const obbRef = db.collection('oldBatteryStock').doc();
      transaction.set(obbRef, {
        code: `OB-${Date.now().toString().slice(-6)}`,
        type: obb.batteryType || 'IPS Tubular',
        brand: obb.brand || 'Lucas',
        capacityAh: obb.capacityAh || '100Ah',
        condition: obb.condition || 'SCRAP',
        quantity: obb.quantity,
        buybackPrice: obb.unitPrice,
        totalCost: obbTotal,
        status: 'IN_STOCK',
        sourceCustomerId: customerId,
        sourceCustomerName: customerName,
        sourceInvoiceNo: invoiceNo,
        notes: obb.notes || '',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }

    // Financial formulas
    const netPayable = Math.max(0, grossSale - salesDiscount - oldBatteryBuybackAmount);
    const dueAmount = Math.max(0, netPayable - paidAmount);
    const saleStatus = dueAmount === 0 ? 'Paid' : paidAmount > 0 ? 'Partial' : 'Due';

    // Write Sale document
    const saleRef = db.collection('sales').doc();
    const saleDocData = {
      invoiceNo,
      date: admin.firestore.FieldValue.serverTimestamp(),
      customerId: customerId || 'walk-in',
      customerName: customerName || 'Walk-in Retail Customer',
      customerPhone: customerPhone || '',
      grossSale,
      salesDiscount,
      oldBatteryBuybackAmount,
      netPayable,
      paidAmount,
      dueAmount,
      paymentMethod,
      accountId: accountId || 'acc-1',
      status: saleStatus,
      items: saleItemsSnapshots,
      oldBatteryBuybacks,
      createdBy: context.auth!.token.name || context.auth!.uid,
      notes,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    transaction.set(saleRef, saleDocData);

    // Update Customer Due
    if (customerId && customerId !== 'cst-walkin' && dueAmount > 0) {
      const custRef = db.collection('customers').doc(customerId);
      const custDoc = await transaction.get(custRef);
      if (custDoc.exists) {
        const currentDue = custDoc.data()!.currentDue || 0;
        transaction.update(custRef, {
          currentDue: currentDue + dueAmount,
          totalPurchased: (custDoc.data()!.totalPurchased || 0) + netPayable,
          totalPaid: (custDoc.data()!.totalPaid || 0) + paidAmount,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      }
    }

    // Update Account Balance if cash/bank received
    if (paidAmount > 0 && accountId) {
      const accRef = db.collection('accounts').doc(accountId);
      const accDoc = await transaction.get(accRef);
      if (accDoc.exists) {
        const accBalance = accDoc.data()!.balance || 0;
        transaction.update(accRef, {
          balance: accBalance + paidAmount,
          totalIn: (accDoc.data()!.totalIn || 0) + paidAmount,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        // Record account transaction
        const txRef = db.collection('accountTransactions').doc();
        transaction.set(txRef, {
          accountId,
          accountName: accDoc.data()!.name,
          date: admin.firestore.FieldValue.serverTimestamp(),
          type: 'SALE_PAYMENT',
          direction: 'IN',
          amount: paidAmount,
          balanceAfter: accBalance + paidAmount,
          referenceType: 'SALE_INVOICE',
          referenceId: invoiceNo,
          description: `Sale to ${customerName} (Net payable: ${netPayable})`,
          createdBy: context.auth!.uid,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      }
    }

    // Write Audit Log
    const auditRef = db.collection('auditLogs').doc();
    transaction.set(auditRef, {
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      userId: context.auth!.uid,
      userName: context.auth!.token.name || 'Staff',
      userRole: context.auth!.token.role || 'CASHIER',
      action: 'CREATE',
      module: 'POS / Sales',
      recordId: invoiceNo,
      description: `Created Sale ${invoiceNo}: Gross ৳${grossSale}, Buyback -৳${oldBatteryBuybackAmount}, Net ৳${netPayable}, Paid ৳${paidAmount}`,
      status: 'SUCCESS',
    });

    return {
      saleId: saleRef.id,
      invoiceNo,
      grossSale,
      oldBatteryBuybackAmount,
      netPayable,
      paidAmount,
      dueAmount,
      status: saleStatus,
    };
  });
});

/**
 * 2. createPurchase: Atomic inventory consignment receipt
 */
export const createPurchase = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated.');
  }

  const { purchaseNo, supplierId, items, paidAmount = 0, accountId, paymentMethod = 'BANK', notes = '' } = data;

  return await db.runTransaction(async (transaction) => {
    let total = 0;
    const supRef = db.collection('suppliers').doc(supplierId);
    const supDoc = await transaction.get(supRef);
    if (!supDoc.exists) throw new functions.https.HttpsError('not-found', 'Supplier not found.');

    for (const it of items) {
      total += it.quantity * it.purchaseCost;
      const prodRef = db.collection('products').doc(it.productId);
      const prodDoc = await transaction.get(prodRef);
      if (prodDoc.exists) {
        const newStock = (prodDoc.data()!.currentStock || 0) + it.quantity;
        transaction.update(prodRef, {
          currentStock: newStock,
          purchasePrice: it.purchaseCost,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        const moveRef = db.collection('stockMovements').doc();
        transaction.set(moveRef, {
          productId: it.productId,
          productName: prodDoc.data()!.name,
          sku: prodDoc.data()!.sku,
          type: 'PURCHASE',
          quantityIn: it.quantity,
          quantityOut: 0,
          balanceAfter: newStock,
          referenceType: 'PURCHASE_ORDER',
          referenceId: purchaseNo,
          createdBy: context.auth!.uid,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      }
    }

    const dueAmount = Math.max(0, total - paidAmount);
    const purRef = db.collection('purchases').doc();
    transaction.set(purRef, {
      purchaseNo,
      supplierId,
      supplierName: supDoc.data()!.name,
      total,
      paidAmount,
      dueAmount,
      status: dueAmount === 0 ? 'RECEIVED' : 'PARTIAL',
      paymentMethod,
      accountId,
      notes,
      items,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Update supplier payable liability
    transaction.update(supRef, {
      currentDue: (supDoc.data()!.currentDue || 0) + dueAmount,
      totalPurchased: (supDoc.data()!.totalPurchased || 0) + total,
      totalPaid: (supDoc.data()!.totalPaid || 0) + paidAmount,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // If paid, debit cash/bank
    if (paidAmount > 0 && accountId) {
      const accRef = db.collection('accounts').doc(accountId);
      const accDoc = await transaction.get(accRef);
      if (accDoc.exists) {
        transaction.update(accRef, {
          balance: accDoc.data()!.balance - paidAmount,
          totalOut: (accDoc.data()!.totalOut || 0) + paidAmount,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      }
    }

    return { purchaseId: purRef.id, total, dueAmount };
  });
});

/**
 * 3. transferAccount: Neutral inter-account liquidity shift
 */
export const transferAccount = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated.');
  }

  const { fromAccountId, toAccountId, amount, reference = '', notes = '' } = data;
  if (fromAccountId === toAccountId || amount <= 0) {
    throw new functions.https.HttpsError('invalid-argument', 'Invalid accounts or amount.');
  }

  return await db.runTransaction(async (transaction) => {
    const fromRef = db.collection('accounts').doc(fromAccountId);
    const toRef = db.collection('accounts').doc(toAccountId);

    const fromDoc = await transaction.get(fromRef);
    const toDoc = await transaction.get(toRef);

    if (!fromDoc.exists || !toDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'One or both accounts not found.');
    }

    if (fromDoc.data()!.balance < amount) {
      throw new functions.https.HttpsError('failed-precondition', 'Insufficient balance in source account.');
    }

    const newFromBal = fromDoc.data()!.balance - amount;
    const newToBal = toDoc.data()!.balance + amount;

    transaction.update(fromRef, {
      balance: newFromBal,
      totalOut: (fromDoc.data()!.totalOut || 0) + amount,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    transaction.update(toRef, {
      balance: newToBal,
      totalIn: (toDoc.data()!.totalIn || 0) + amount,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    const trfRef = db.collection('accountTransfers').doc();
    transaction.set(trfRef, {
      transferNo: `TRF-${Date.now().toString().slice(-6)}`,
      fromAccountId,
      fromAccountName: fromDoc.data()!.name,
      toAccountId,
      toAccountName: toDoc.data()!.name,
      amount,
      reference,
      notes,
      createdBy: context.auth!.uid,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return { success: true, newFromBal, newToBal };
  });
});
