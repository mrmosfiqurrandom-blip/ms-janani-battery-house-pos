import React, { useState, useEffect } from 'react';
import { reportService, DashboardMetrics } from '../services/reportService';
import { formatBDT } from '../utils/formatters';
import {
  BarChart3,
  TrendingUp,
  Download,
  Printer,
  Calendar,
  Layers,
  DollarSign,
  RotateCcw,
  Users,
  Building2,
  Receipt,
  ArrowRight,
} from 'lucide-react';
import { Link } from 'react-router-dom';

export const ReportsPage: React.FC = () => {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [filterPeriod, setFilterPeriod] = useState('THIS_MONTH');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    reportService.getDashboardMetrics().then((m) => {
      setMetrics(m);
      setLoading(false);
    });
  }, []);

  const handleExport = () => {
    alert('Export CSV / Excel report generation will be hooked to Cloud Functions in Step 2.');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Business Intelligence & Reports</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Audit-ready reporting covering sales turnover, recycling valuation, and dues
          </p>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={filterPeriod}
            onChange={(e) => setFilterPeriod(e.target.value)}
            className="text-xs p-2 bg-white border border-slate-300 rounded font-medium text-slate-700"
          >
            <option value="TODAY">Today</option>
            <option value="THIS_WEEK">This Week</option>
            <option value="THIS_MONTH">This Month</option>
            <option value="LAST_MONTH">Last Month</option>
            <option value="YEAR">Financial Year 2026</option>
          </select>

          <button
            onClick={handleExport}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Featured P&L Banner */}
      <div className="p-5 bg-gradient-to-r from-slate-900 to-slate-800 text-white rounded-lg shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold text-amber-400 uppercase tracking-wider block mb-1">
            Primary Financial Report
          </span>
          <h2 className="text-base font-bold">Comprehensive Profit & Loss Statement (P&L)</h2>
          <p className="text-xs text-slate-300 mt-1 max-w-xl">
            Displays Sales Turnover, COGS, separate Old Battery Buyback costs, Operating Expenses,
            and Supplier Commission income in compliance with standard shop accounting.
          </p>
        </div>
        <Link
          to="/reports/profit-loss"
          className="px-4 py-2 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs rounded transition-colors inline-flex items-center gap-1.5 shrink-0"
        >
          <span>View Statement</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Report Categories Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Sales Reports */}
        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-2.5">
            <BarChart3 className="w-4 h-4 text-amber-600" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
              Sales Analytics
            </h3>
          </div>
          <ul className="space-y-2 text-xs text-slate-700">
            <li className="flex justify-between items-center py-1 hover:text-slate-900 cursor-pointer">
              <span>Daily Sales Turnover</span>
              <span className="font-mono text-slate-500 font-medium">৳45,200</span>
            </li>
            <li className="flex justify-between items-center py-1 hover:text-slate-900 cursor-pointer">
              <span>Old Battery Buyback Total</span>
              <span className="font-mono text-rose-600 font-semibold">৳11,400</span>
            </li>
            <li className="flex justify-between items-center py-1 hover:text-slate-900 cursor-pointer">
              <span>Category-wise Battery Sales</span>
              <span className="font-mono text-slate-500">82% Share</span>
            </li>
            <li className="flex justify-between items-center py-1 hover:text-slate-900 cursor-pointer">
              <span>Salesperson Counter Performance</span>
              <span className="text-slate-400">View →</span>
            </li>
          </ul>
        </div>

        {/* Inventory & Recycling Reports */}
        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-2.5">
            <Layers className="w-4 h-4 text-blue-600" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
              Inventory & Recycling
            </h3>
          </div>
          <ul className="space-y-2 text-xs text-slate-700">
            <li className="flex justify-between items-center py-1 hover:text-slate-900 cursor-pointer">
              <span>Warehouse Stock Valuation</span>
              <span className="font-mono text-slate-500 font-medium">
                {metrics ? formatBDT(metrics.totalStockValue) : '-'}
              </span>
            </li>
            <li className="flex justify-between items-center py-1 hover:text-slate-900 cursor-pointer">
              <span>Old Battery Scrap Pool</span>
              <span className="font-mono text-amber-600 font-semibold">
                {metrics ? `${metrics.oldBatteryInStockCount} units` : '-'}
              </span>
            </li>
            <li className="flex justify-between items-center py-1 hover:text-slate-900 cursor-pointer">
              <span>Low Stock Replenishment List</span>
              <span className="font-mono text-rose-600 font-bold">
                {metrics?.lowStockCount} items
              </span>
            </li>
            <li className="flex justify-between items-center py-1 hover:text-slate-900 cursor-pointer">
              <span>Stock Movement Audit</span>
              <span className="text-slate-400">View →</span>
            </li>
          </ul>
        </div>

        {/* Dues & Receivables Reports */}
        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-2.5">
            <DollarSign className="w-4 h-4 text-emerald-600" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
              Dues & Cash Flow
            </h3>
          </div>
          <ul className="space-y-2 text-xs text-slate-700">
            <li className="flex justify-between items-center py-1 hover:text-slate-900 cursor-pointer">
              <span>Customer Aging Receivables</span>
              <span className="font-mono text-rose-600 font-semibold">
                {metrics ? formatBDT(metrics.customerDueTotal) : '-'}
              </span>
            </li>
            <li className="flex justify-between items-center py-1 hover:text-slate-900 cursor-pointer">
              <span>Supplier Purchase Payables</span>
              <span className="font-mono text-amber-600 font-semibold">
                {metrics ? formatBDT(metrics.supplierDueTotal) : '-'}
              </span>
            </li>
            <li className="flex justify-between items-center py-1 hover:text-slate-900 cursor-pointer">
              <span>Manufacturer Commission Due</span>
              <span className="font-mono text-emerald-700 font-bold">
                {metrics ? formatBDT(metrics.supplierCommissionDueTotal) : '-'}
              </span>
            </li>
            <li className="flex justify-between items-center py-1 hover:text-slate-900 cursor-pointer">
              <span>Net Liquid Cash & Bank</span>
              <span className="font-mono text-slate-900 font-bold">
                {metrics ? formatBDT(metrics.totalLiquidBalance) : '-'}
              </span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};
