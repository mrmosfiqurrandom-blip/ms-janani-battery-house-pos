import React, { useEffect, useState } from 'react';
import { reportService, DashboardMetrics } from '../services/reportService';
import { salesService } from '../services/salesService';
import { productService } from '../services/productService';
import { useAuth } from '../context/AuthContext';
import { Sale, Product } from '../types';
import { formatBDT, formatDateTime, formatDate } from '../utils/formatters';
import { StatusBadge } from '../components/StatusBadge';
import { InvoiceModal } from '../components/InvoiceModal';
import {
  TrendingUp,
  CreditCard,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
  ShoppingBag,
  RotateCcw,
  Sparkles,
  Zap,
  Eye,
  Layers,
  ArrowRight,
  Loader2,
  EyeOff,
} from 'lucide-react';
import { Link } from 'react-router-dom';

export const DashboardPage: React.FC = () => {
  const { role } = useAuth();
  const isCashier = role === 'CASHIER';

  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [recentSales, setRecentSales] = useState<Sale[]>([]);
  const [lowStockProducts, setLowStockProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedInvoice, setSelectedInvoice] = useState<Sale | null>(null);

  useEffect(() => {
    loadDashboard();

    // Attach real-time listeners for sales and products
    const unsubSales = salesService.subscribeSales((sales) => {
      setRecentSales(sales.slice(0, 5));
      reportService.getDashboardMetrics().then(setMetrics).catch(() => {});
    });

    const unsubProducts = productService.subscribeProducts((prods) => {
      setLowStockProducts(prods.filter((p) => p.currentStock <= p.minStockLevel));
    });

    return () => {
      unsubSales();
      unsubProducts();
    };
  }, []);

  const loadDashboard = async () => {
    setLoading(true);
    try {
      const [metricData, sales, products] = await Promise.all([
        reportService.getDashboardMetrics(),
        salesService.getSales().catch(() => []),
        productService.getProducts().catch(() => []),
      ]);
      setMetrics(metricData);
      setRecentSales((sales || []).slice(0, 5));
      setLowStockProducts((products || []).filter((p) => p.currentStock <= p.minStockLevel));
    } catch (err) {
      console.error('Failed to load dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !metrics) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-slate-400 gap-2">
        <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
        <span className="text-xs">Connecting to Firestore in real time...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Title & Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Executive Dashboard</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time business performance, cash flow, stock status & buyback analytics
            {isCashier && (
              <span className="ml-2 inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-100 px-2 py-0.5 rounded">
                <EyeOff className="w-3 h-3" /> Cashier Mode (Costs & supplier reports hidden)
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/pos"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-md transition-colors shadow-xs"
          >
            <Zap className="w-3.5 h-3.5 fill-current" />
            <span>Launch POS Terminal</span>
          </Link>
        </div>
      </div>

      {/* ================= 1. TODAY'S SALES BREAKDOWN ================= */}
      <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-xs">
        <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-600">
            Sales & Buyback Breakdown (Strict Financial Division)
          </h2>
          <span className="text-[11px] text-slate-400 font-mono">Today's Transactions</span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-3 bg-slate-50 rounded border border-slate-100">
            <span className="text-[11px] text-slate-500 font-medium block">Gross Sales Value</span>
            <span className="text-lg font-bold text-slate-900 font-mono tabular-nums block mt-1">
              {formatBDT(metrics.todaySalesGross)}
            </span>
            <span className="text-[10px] text-slate-400">Total catalog price</span>
          </div>

          <div className="p-3 bg-slate-50 rounded border border-slate-100">
            <span className="text-[11px] text-slate-500 font-medium block">Discount Given</span>
            <span className="text-lg font-bold text-amber-700 font-mono tabular-nums block mt-1">
              {formatBDT(metrics.todaySalesDiscount)}
            </span>
            <span className="text-[10px] text-slate-400">Promotions & customer off</span>
          </div>

          <div className="p-3 bg-rose-50/70 rounded border border-rose-200/80">
            <span className="text-[11px] text-rose-950 font-semibold block">Old Battery Scrap Buyback</span>
            <span className="text-lg font-bold text-rose-700 font-mono tabular-nums block mt-1">
              {formatBDT(metrics.todayOldBatteryBuyback)}
            </span>
            <span className="text-[10px] text-rose-800/80">Credited to customers (Not discount)</span>
          </div>

          <div className="p-3 bg-emerald-50/70 rounded border border-emerald-200/80">
            <span className="text-[11px] text-emerald-950 font-semibold block">Net Customer Receivable</span>
            <span className="text-lg font-bold text-emerald-700 font-mono tabular-nums block mt-1">
              {formatBDT(metrics.todaySalesNet)}
            </span>
            <span className="text-[10px] text-emerald-800">
              Paid: {formatBDT(metrics.todaySalesPaid)}
            </span>
          </div>
        </div>
      </div>

      {/* ================= 2. LIQUID MONEY & ACCOUNT BALANCES ================= */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-medium">Cash Drawer</span>
            <Wallet className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-base font-bold text-slate-900 font-mono tabular-nums">
            {formatBDT(metrics.cashBalance)}
          </p>
          <span className="text-[10px] text-slate-400">Counter physical cash</span>
        </div>

        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-medium">Bank Accounts</span>
            <CreditCard className="w-4 h-4 text-blue-600" />
          </div>
          <p className="text-base font-bold text-slate-900 font-mono tabular-nums">
            {formatBDT(metrics.bankBalance)}
          </p>
          <span className="text-[10px] text-slate-400">City Bank Current A/C</span>
        </div>

        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-medium">bKash Merchant</span>
            <span className="text-xs font-bold text-pink-600">bKash</span>
          </div>
          <p className="text-base font-bold text-slate-900 font-mono tabular-nums">
            {formatBDT(metrics.bkashBalance)}
          </p>
          <span className="text-[10px] text-slate-400">Merchant Wallet</span>
        </div>

        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-medium">Nagad Merchant</span>
            <span className="text-xs font-bold text-orange-600">Nagad</span>
          </div>
          <p className="text-base font-bold text-slate-900 font-mono tabular-nums">
            {formatBDT(metrics.nagadBalance)}
          </p>
          <span className="text-[10px] text-slate-400">Merchant Wallet</span>
        </div>
      </div>

      {/* ================= 3. RECEIVABLES & PAYABLES (MANAGERS / ADMINS ONLY) ================= */}
      {!isCashier && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Customer Due */}
          <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Customer Dues</span>
              <span className="text-[11px] text-rose-600 font-medium">Receivable</span>
            </div>
            <p className="text-xl font-bold text-rose-600 font-mono tabular-nums mt-2">
              {formatBDT(metrics.customerDueTotal)}
            </p>
            <p className="text-xs text-slate-500 mt-1">Outstanding amounts from fleet & wholesale clients</p>
            <Link
              to="/customers"
              className="inline-flex items-center gap-1 text-xs font-medium text-slate-700 hover:text-slate-900 mt-3"
            >
              <span>View Customer Ledger</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Supplier Due (Payable) */}
          <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Supplier Dues</span>
              <span className="text-[11px] text-amber-600 font-medium">Payable</span>
            </div>
            <p className="text-xl font-bold text-amber-600 font-mono tabular-nums mt-2">
              {formatBDT(metrics.supplierDueTotal)}
            </p>
            <p className="text-xs text-slate-500 mt-1">Consignment bills payable to manufacturers</p>
            <Link
              to="/suppliers"
              className="inline-flex items-center gap-1 text-xs font-medium text-slate-700 hover:text-slate-900 mt-3"
            >
              <span>View Supplier Bills</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Supplier Commission Due (Receivable) */}
          <div className="bg-white p-4 rounded-lg border border-emerald-200 bg-emerald-50/20 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-800">
                Supplier Commission Due
              </span>
              <span className="text-[11px] text-emerald-700 font-bold bg-emerald-100 px-1.5 py-0.5 rounded">
                Receivable
              </span>
            </div>
            <p className="text-xl font-bold text-emerald-700 font-mono tabular-nums mt-2">
              {formatBDT(metrics.supplierCommissionDueTotal)}
            </p>
            <p className="text-xs text-emerald-800/80 mt-1">
              Target rebate & dealer incentives to collect from suppliers
            </p>
            <Link
              to="/supplier-commission"
              className="inline-flex items-center gap-1 text-xs font-medium text-emerald-800 hover:text-emerald-950 mt-3"
            >
              <span>Open Commission Module</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      )}

      {/* ================= 4. STOCK & RECYCLING INVENTORY ================= */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Product Stock */}
        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-blue-600" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                New Products Inventory
              </h3>
            </div>
            <Link to="/inventory/products" className="text-xs text-slate-500 hover:text-slate-900">
              Manage Products →
            </Link>
          </div>
          <div className="flex items-baseline justify-between mt-3">
            <div>
              {!isCashier ? (
                <p className="text-2xl font-bold text-slate-900 font-mono tabular-nums">
                  {formatBDT(metrics.totalStockValue)}
                </p>
              ) : (
                <p className="text-2xl font-bold text-slate-900 font-mono tabular-nums">
                  {metrics.totalStockUnits} Units
                </p>
              )}
              <p className="text-xs text-slate-500 mt-0.5">
                Total physical inventory across {metrics.totalStockUnits} units in warehouse
              </p>
            </div>
            {metrics.lowStockCount > 0 && (
              <div className="text-right">
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-rose-700 bg-rose-50 px-2 py-1 rounded border border-rose-200">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  {metrics.lowStockCount} items low in stock
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Old Battery Scrap Pool */}
        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <RotateCcw className="w-4 h-4 text-rose-600" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Old Battery Scrap Inventory
              </h3>
            </div>
            <Link to="/inventory/old-batteries" className="text-xs text-rose-600 hover:text-rose-800 font-semibold">
              Scrap Hub →
            </Link>
          </div>
          <div className="flex items-baseline justify-between mt-3">
            <div>
              <p className="text-2xl font-bold text-rose-700 font-mono tabular-nums">
                {formatBDT(metrics.oldBatteryBuybackValue)}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                {metrics.oldBatteryInStockCount} recycled batteries in scrap inventory
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ================= 5. RECENT SALES INVOICES & LOW STOCK ALERTS ================= */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Invoices */}
        <div className="lg:col-span-2 bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Recent Sales Invoices
            </h3>
            <Link to="/sales-history" className="text-xs font-semibold text-amber-700 hover:text-amber-800">
              View All Invoices →
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[10px]">
                <tr>
                  <th className="py-2.5 px-4">Invoice No</th>
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Customer</th>
                  <th className="py-2.5 px-3 text-right">Net Payable</th>
                  <th className="py-2.5 px-3 text-right">Due</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                  <th className="py-2.5 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentSales.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400">
                      No sales recorded in Firestore yet.
                    </td>
                  </tr>
                ) : (
                  recentSales.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50">
                      <td className="py-2.5 px-4 font-mono font-bold text-slate-900">{s.invoiceNo}</td>
                      <td className="py-2.5 px-3 text-slate-500">{formatDate(s.date)}</td>
                      <td className="py-2.5 px-3 font-medium text-slate-800">{s.customerName}</td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                        {formatBDT(s.netPayable)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-rose-600 font-semibold">
                        {s.dueAmount > 0 ? formatBDT(s.dueAmount) : '-'}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <StatusBadge status={s.status} />
                      </td>
                      <td className="py-2.5 px-4 text-right">
                        <button
                          onClick={() => setSelectedInvoice(s)}
                          className="p-1 text-slate-400 hover:text-slate-800 rounded"
                          title="View Invoice"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Low Stock Watchlist */}
        <div className="bg-white rounded-lg border border-slate-200 shadow-xs flex flex-col">
          <div className="p-4 border-b border-slate-200 flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-rose-500" />
              <span>Low Stock Watchlist</span>
            </h3>
            <span className="text-[10px] bg-rose-100 text-rose-800 px-1.5 py-0.5 rounded font-bold">
              {lowStockProducts.length} Alert{lowStockProducts.length !== 1 ? 's' : ''}
            </span>
          </div>

          <div className="p-3 divide-y divide-slate-100 flex-1 overflow-y-auto max-h-72">
            {lowStockProducts.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-8">
                All inventory levels healthy above reorder thresholds.
              </p>
            ) : (
              lowStockProducts.map((p) => (
                <div key={p.id} className="py-2.5 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-semibold text-slate-900 block truncate max-w-[180px]">
                      {p.name}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">{p.sku}</span>
                  </div>
                  <div className="text-right">
                    <span className="font-mono font-bold text-rose-600">
                      {p.currentStock} {p.unit}
                    </span>
                    <span className="text-[10px] text-slate-400 block">Min: {p.minStockLevel}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Invoice modal */}
      {selectedInvoice && (
        <InvoiceModal isOpen={!!selectedInvoice} sale={selectedInvoice} onClose={() => setSelectedInvoice(null)} />
      )}
    </div>
  );
};
