import React, { useState, useEffect } from 'react';
import { reportService, ProfitLossReport } from '../services/reportService';
import { formatBDT } from '../utils/formatters';
import { Printer, Download, Calendar, TrendingUp, Sparkles, FileText } from 'lucide-react';

export const ProfitLossPage: React.FC = () => {
  const [report, setReport] = useState<ProfitLossReport | null>(null);
  const [period, setPeriod] = useState<'TODAY' | 'THIS_MONTH' | 'LAST_MONTH' | 'YTD'>('THIS_MONTH');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadReport();
  }, [period]);

  const loadReport = async () => {
    setLoading(true);
    try {
      const data = await reportService.getProfitLoss();
      setReport(data);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading || !report) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-400">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Title & Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 no-print">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Profit & Loss Financial Statement
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Strict GAAP/IFRS statement with separate line item for Old Battery Buyback Cost
          </p>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value as any)}
            className="text-xs p-2 bg-white border border-slate-300 rounded font-medium text-slate-700"
          >
            <option value="TODAY">Today (Real-time)</option>
            <option value="THIS_MONTH">This Month (October 2026)</option>
            <option value="LAST_MONTH">Last Month (September 2026)</option>
            <option value="YTD">Year-to-Date (FY 2026)</option>
          </select>

          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-800 bg-white border border-slate-300 hover:bg-slate-50 rounded transition-colors"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print P&L</span>
          </button>
        </div>
      </div>

      {/* Main Statement Card */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-xs max-w-4xl mx-auto p-6 sm:p-10 font-sans text-xs">
        {/* Header */}
        <div className="border-b border-slate-200 pb-5 text-center">
          <h2 className="text-base font-bold text-slate-900 uppercase tracking-wider">
            VoltPulse Battery & Electronics
          </h2>
          <p className="text-slate-500 mt-0.5">Statement of Profit or Loss & Comprehensive Income</p>
          <p className="text-[11px] text-slate-400 font-mono mt-1">
            Reporting Period: {period.replace(/_/g, ' ')} · Currency: Bangladeshi Taka (BDT)
          </p>
        </div>

        <div className="mt-6 space-y-6">
          {/* ================= 1. REVENUE ================= */}
          <div>
            <div className="flex justify-between items-center font-bold text-sm text-slate-900 border-b border-slate-300 pb-1.5 mb-2">
              <span>Operating Revenue</span>
              <span>Amount (BDT)</span>
            </div>

            <div className="space-y-1.5 pl-4">
              <div className="flex justify-between text-slate-700">
                <span>Gross Sales Turnover (Catalog Invoiced)</span>
                <span className="font-mono tabular-nums">{formatBDT(report.grossSalesRevenue)}</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Less: Sales & Promotional Discounts</span>
                <span className="font-mono tabular-nums">
                  ({formatBDT(report.salesDiscount)})
                </span>
              </div>
            </div>

            <div className="flex justify-between font-bold text-slate-900 pt-2 border-t border-slate-100 pl-4 mt-2">
              <span>Net Sales Revenue</span>
              <span className="font-mono tabular-nums">{formatBDT(report.netSalesRevenue)}</span>
            </div>
          </div>

          {/* ================= 2. COST OF SALES (EXPLICIT OLD BATTERY BUYBACK) ================= */}
          <div>
            <div className="flex justify-between items-center font-bold text-sm text-slate-900 border-b border-slate-300 pb-1.5 mb-2">
              <span>Cost of Sales</span>
              <span>Amount (BDT)</span>
            </div>

            <div className="space-y-1.5 pl-4">
              <div className="flex justify-between text-slate-700">
                <span>Cost of Goods Sold (New Hardware Wholesale)</span>
                <span className="font-mono tabular-nums">{formatBDT(report.costOfGoodsSold)}</span>
              </div>

              {/* CRITICAL SEPARATE LINE FOR OLD BATTERY BUYBACK COST */}
              <div className="flex justify-between font-semibold text-rose-700 bg-rose-50/70 p-1.5 rounded border border-rose-200">
                <div>
                  <span>Old Battery Buyback Cost (Recycled Lead Exchange)</span>
                  <span className="block text-[10px] text-rose-800 font-normal">
                    * Credited to retail customers at counter; segregated from sales discounts.
                  </span>
                </div>
                <span className="font-mono tabular-nums">
                  {formatBDT(report.oldBatteryBuybackCost)}
                </span>
              </div>
            </div>

            <div className="flex justify-between font-bold text-slate-900 pt-2 border-t border-slate-100 pl-4 mt-2">
              <span>Total Cost of Sales</span>
              <span className="font-mono tabular-nums text-rose-700">
                ({formatBDT(report.totalCostOfSales)})
              </span>
            </div>
          </div>

          {/* ================= GROSS PROFIT ================= */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded flex justify-between items-center font-bold text-sm">
            <span className="text-slate-900">Gross Operating Profit</span>
            <span className="font-mono tabular-nums text-slate-950">
              {formatBDT(report.grossProfit)}
            </span>
          </div>

          {/* ================= 3. OPERATING EXPENSES ================= */}
          <div>
            <div className="flex justify-between items-center font-bold text-sm text-slate-900 border-b border-slate-300 pb-1.5 mb-2">
              <span>Operating Expenses</span>
              <span>Amount (BDT)</span>
            </div>

            <div className="space-y-1.5 pl-4">
              <div className="flex justify-between text-slate-700">
                <span>Shop Premises Rent & Electricity Utilities</span>
                <span className="font-mono tabular-nums">৳41,850</span>
              </div>
              <div className="flex justify-between text-slate-700">
                <span>Transport, Logistics & Van Fare</span>
                <span className="font-mono tabular-nums">৳1,800</span>
              </div>
              <div className="flex justify-between text-slate-700">
                <span>Stationery & Office General Expense</span>
                <span className="font-mono tabular-nums">৳1,250</span>
              </div>
            </div>

            <div className="flex justify-between font-bold text-slate-900 pt-2 border-t border-slate-100 pl-4 mt-2">
              <span>Total Operating Expenses</span>
              <span className="font-mono tabular-nums text-rose-700">
                ({formatBDT(report.operatingExpenses)})
              </span>
            </div>
          </div>

          {/* ================= 4. OTHER OPERATING INCOME (SUPPLIER COMMISSION) ================= */}
          <div>
            <div className="flex justify-between items-center font-bold text-sm text-slate-900 border-b border-slate-300 pb-1.5 mb-2">
              <span>Other Operating Income</span>
              <span>Amount (BDT)</span>
            </div>

            <div className="space-y-1.5 pl-4">
              {/* CRITICAL SEPARATE LINE FOR SUPPLIER COMMISSIONS */}
              <div className="flex justify-between font-semibold text-emerald-800 bg-emerald-50/70 p-1.5 rounded border border-emerald-200">
                <div>
                  <span>Supplier Commissions & Rebates Earned</span>
                  <span className="block text-[10px] text-emerald-700 font-normal">
                    * Rahimafrooz & Hamko volume rebates recognized in target periods.
                  </span>
                </div>
                <span className="font-mono tabular-nums">
                  +{formatBDT(report.supplierCommissionIncome)}
                </span>
              </div>
            </div>
          </div>

          {/* ================= NET PROFIT ================= */}
          <div className="p-4 bg-emerald-500/10 border-2 border-emerald-500 rounded-lg flex justify-between items-center">
            <div>
              <span className="text-base font-bold text-emerald-950 block">Net Profit / (Loss)</span>
              <span className="text-[11px] text-emerald-800">
                Before tax & statutory distributions
              </span>
            </div>
            <span className="text-xl font-bold font-mono tabular-nums text-emerald-800">
              {formatBDT(report.netOperatingProfit)}
            </span>
          </div>
        </div>

        {/* Footer Notes */}
        <div className="mt-8 pt-4 border-t border-slate-200 text-slate-400 text-[10px] text-center">
          Generated automatically by VoltPulse ERP Accounting Module · Unaudited Management Report
        </div>
      </div>
    </div>
  );
};
