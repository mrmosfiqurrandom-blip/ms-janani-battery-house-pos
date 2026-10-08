import { salesService } from './salesService';
import { purchaseService } from './purchaseService';
import { expenseService } from './expenseService';
import { accountService } from './accountService';
import { commissionService } from './commissionService';
import { oldBatteryService } from './oldBatteryService';
import { customerService } from './customerService';
import { supplierService } from './supplierService';
import { productService } from './productService';

export interface DashboardMetrics {
  todaySalesGross: number;
  todaySalesDiscount: number;
  todayOldBatteryBuyback: number;
  todaySalesNet: number;
  todaySalesPaid: number;
  todayPurchases: number;
  todayExpenses: number;
  todayEstimatedProfit: number;
  
  // Balances
  cashBalance: number;
  bankBalance: number;
  bkashBalance: number;
  nagadBalance: number;
  totalLiquidBalance: number;

  // Receivables & Payables
  customerDueTotal: number;
  supplierDueTotal: number;
  supplierCommissionDueTotal: number;

  // Stock
  totalStockValue: number;
  totalStockUnits: number;
  lowStockCount: number;
  oldBatteryInStockCount: number;
  oldBatteryBuybackValue: number;
}

export interface ProfitLossReport {
  grossSalesRevenue: number;
  salesDiscount: number;
  netSalesRevenue: number;

  costOfGoodsSold: number;
  oldBatteryBuybackCost: number; // SEPARATELY HIGHLIGHTED
  totalCostOfSales: number;

  grossProfit: number;

  operatingExpenses: number;
  supplierCommissionIncome: number; // SEPARATELY HIGHLIGHTED

  netOperatingProfit: number;
}

export const reportService = {
  async getDashboardMetrics(): Promise<DashboardMetrics> {
    const [sales, purchases, expenses, accounts, customers, suppliers, commissions, oldBatSummary, products] =
      await Promise.all([
        salesService.getSales().catch((e) => {
          console.warn('Sales fetch notice:', e);
          return [];
        }),
        purchaseService.getPurchases().catch((e) => {
          console.warn('Purchases fetch notice:', e);
          return [];
        }),
        expenseService.getExpenses().catch((e) => {
          console.warn('Expenses fetch notice:', e);
          return [];
        }),
        accountService.getAccounts().catch((e) => {
          console.warn('Accounts fetch notice:', e);
          return [];
        }),
        customerService.getCustomers().catch((e) => {
          console.warn('Customers fetch notice:', e);
          return [];
        }),
        supplierService.getSuppliers().catch((e) => {
          console.warn('Suppliers fetch notice:', e);
          return [];
        }),
        commissionService.getSummary().catch(() => ({ totalEarned: 0, totalReceived: 0, totalDue: 0 })),
        oldBatteryService
          .getSummary()
          .catch(() => ({ inStockCount: 0, totalBuybackCost: 0, soldValueTotal: 0, totalProfitLoss: 0 })),
        productService.getProducts().catch((e) => {
          console.warn('Products fetch notice:', e);
          return [];
        }),
      ]);

    // Active sales (not voided)
    const activeSales = sales.filter((s) => s.status !== 'Voided' && s.status !== 'Cancelled');
    const todaySalesGross = activeSales.reduce((acc, s) => acc + s.grossSale, 0);
    const todaySalesDiscount = activeSales.reduce((acc, s) => acc + s.salesDiscount, 0);
    const todayOldBatteryBuyback = activeSales.reduce((acc, s) => acc + s.oldBatteryBuybackAmount, 0);
    const todaySalesNet = activeSales.reduce((acc, s) => acc + s.netPayable, 0);
    const todaySalesPaid = activeSales.reduce((acc, s) => acc + s.paidAmount, 0);

    const todayPurchases = purchases
      .filter((p) => p.status !== 'CANCELLED')
      .reduce((acc, p) => acc + p.total, 0);

    const todayExpenses = expenses.reduce((acc, e) => acc + e.amount, 0);

    // Accounts
    const cashAcc = accounts.find((a) => a.type === 'CASH')?.balance || 0;
    const bankAcc = accounts.find((a) => a.type === 'BANK')?.balance || 0;
    const bkashAcc = accounts.find((a) => a.type === 'BKASH')?.balance || 0;
    const nagadAcc = accounts.find((a) => a.type === 'NAGAD')?.balance || 0;
    const totalLiquidBalance = cashAcc + bankAcc + bkashAcc + nagadAcc;

    // Dues
    const customerDueTotal = customers.reduce((acc, c) => acc + c.currentDue, 0);
    const supplierDueTotal = suppliers.reduce((acc, s) => acc + s.currentDue, 0);
    const supplierCommissionDueTotal = commissions.totalDue;

    // Stock metrics
    const totalStockValue = products.reduce((acc, p) => acc + p.currentStock * p.purchasePrice, 0);
    const totalStockUnits = products.reduce((acc, p) => acc + p.currentStock, 0);
    const lowStockCount = products.filter((p) => p.currentStock <= p.minStockLevel).length;

    // Rough estimated profit for dashboard
    const estimatedCOGS = todaySalesGross * 0.8; // conservative estimate
    const todayEstimatedProfit = todaySalesGross - todaySalesDiscount - estimatedCOGS - todayExpenses + commissions.totalEarned;

    return {
      todaySalesGross,
      todaySalesDiscount,
      todayOldBatteryBuyback,
      todaySalesNet,
      todaySalesPaid,
      todayPurchases,
      todayExpenses,
      todayEstimatedProfit,
      cashBalance: cashAcc,
      bankBalance: bankAcc,
      bkashBalance: bkashAcc,
      nagadBalance: nagadAcc,
      totalLiquidBalance,
      customerDueTotal,
      supplierDueTotal,
      supplierCommissionDueTotal,
      totalStockValue,
      totalStockUnits,
      lowStockCount,
      oldBatteryInStockCount: oldBatSummary.inStockCount,
      oldBatteryBuybackValue: oldBatSummary.totalBuybackCost,
    };
  },

  async getProfitLoss(): Promise<ProfitLossReport> {
    const [sales, expenses, commissions, oldBatSummary] = await Promise.all([
      salesService.getSales(),
      expenseService.getExpenses(),
      commissionService.getSummary(),
      oldBatteryService.getSummary(),
    ]);

    const activeSales = sales.filter((s) => s.status !== 'Voided');
    const grossSalesRevenue = activeSales.reduce((acc, s) => acc + s.grossSale, 0);
    const salesDiscount = activeSales.reduce((acc, s) => acc + s.salesDiscount, 0);
    const netSalesRevenue = grossSalesRevenue - salesDiscount;

    // Approximate COGS based on product cost in sales or benchmark 78%
    const costOfGoodsSold = Math.round(grossSalesRevenue * 0.78);
    // Old Battery Buyback cost must be explicitly separate
    const oldBatteryBuybackCost = activeSales.reduce((acc, s) => acc + s.oldBatteryBuybackAmount, 0);
    const totalCostOfSales = costOfGoodsSold + oldBatteryBuybackCost;

    const grossProfit = netSalesRevenue - totalCostOfSales;

    const operatingExpenses = expenses.reduce((acc, e) => acc + e.amount, 0);
    const supplierCommissionIncome = commissions.totalEarned;

    const netOperatingProfit = grossProfit - operatingExpenses + supplierCommissionIncome;

    return {
      grossSalesRevenue,
      salesDiscount,
      netSalesRevenue,
      costOfGoodsSold,
      oldBatteryBuybackCost,
      totalCostOfSales,
      grossProfit,
      operatingExpenses,
      supplierCommissionIncome,
      netOperatingProfit,
    };
  },
};
