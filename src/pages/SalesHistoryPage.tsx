import React, { useState, useEffect } from 'react';
import { salesService, SalesFilters } from '../services/salesService';
import { Sale, SaleStatus } from '../types';
import { formatBDT, formatDateTime } from '../utils/formatters';
import { StatusBadge } from '../components/StatusBadge';
import { InvoiceModal } from '../components/InvoiceModal';
import { ConfirmationModal } from '../components/ConfirmationModal';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import {
  Search,
  Eye,
  Printer,
  Ban,
  Filter,
  Download,
  Calendar,
  RotateCcw,
} from 'lucide-react';
import { Link } from 'react-router-dom';

export const SalesHistoryPage: React.FC = () => {
  const { role } = useAuth();
  const { success, error } = useToast();

  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<SaleStatus | 'ALL'>('ALL');

  const [selectedInvoice, setSelectedInvoice] = useState<Sale | null>(null);
  const [voidTarget, setVoidTarget] = useState<Sale | null>(null);

  useEffect(() => {
    setLoading(true);
    const unsub = salesService.subscribeSales(
      (data) => {
        setSales(data);
        setLoading(false);
      },
      {
        status: statusFilter,
        search,
      },
      () => setLoading(false)
    );
    return () => unsub();
  }, [statusFilter, search]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
  };

  const handleConfirmVoid = async (reason?: string) => {
    if (!voidTarget) return;
    try {
      await salesService.voidSale(voidTarget.id, reason || 'Voided by supervisor');
      success('Invoice Voided', `Invoice #${voidTarget.invoiceNo} marked as Voided.`);
      setVoidTarget(null);
    } catch {
      error('Failed to void invoice');
    }
  };

  return (
    <div className="space-y-4">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Sales History & Invoices</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Audit trail of all retail sales, customer buybacks, payments and statuses
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/pos"
            className="px-3 py-1.5 text-xs font-semibold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-md transition-colors"
          >
            + New Sale (POS)
          </Link>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-3.5 rounded-lg border border-slate-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
        <form onSubmit={handleSearchSubmit} className="relative flex-1 w-full md:w-auto">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search invoice number, customer name, or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full text-xs pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-md focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-slate-900"
          />
        </form>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as SaleStatus | 'ALL')}
            className="text-xs p-2 bg-slate-50 border border-slate-300 rounded-md font-medium text-slate-700"
          >
            <option value="ALL">All Statuses</option>
            <option value="Paid">Paid</option>
            <option value="Partial">Partial Due</option>
            <option value="Due">Unpaid Due</option>
            <option value="Voided">Voided</option>
          </select>
        </div>
      </div>

      {/* Sales Table */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-4">Invoice No</th>
                <th className="py-3 px-3">Date</th>
                <th className="py-3 px-3">Customer</th>
                <th className="py-3 px-3 text-right">Gross Sale</th>
                <th className="py-3 px-3 text-right">Discount</th>
                <th className="py-3 px-3 text-right text-rose-700">Old Battery Buyback</th>
                <th className="py-3 px-3 text-right">Paid</th>
                <th className="py-3 px-3 text-right">Due</th>
                <th className="py-3 px-3 text-center">Method</th>
                <th className="py-3 px-3 text-center">Status</th>
                <th className="py-3 px-3 text-center">Created By</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={12} className="py-12 text-center text-slate-400">
                    Loading sales records...
                  </td>
                </tr>
              ) : sales.length === 0 ? (
                <tr>
                  <td colSpan={12} className="py-12 text-center text-slate-400">
                    No sales found matching your criteria.
                  </td>
                </tr>
              ) : (
                sales.map((sale) => (
                  <tr key={sale.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">
                      {sale.invoiceNo}
                    </td>
                    <td className="py-3 px-3 text-slate-600 whitespace-nowrap">
                      {formatDateTime(sale.date)}
                    </td>
                    <td className="py-3 px-3 font-medium text-slate-800">
                      <div>{sale.customerName}</div>
                      {sale.customerPhone && (
                        <div className="text-[10px] text-slate-400 font-mono">
                          {sale.customerPhone}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-3 text-right font-mono tabular-nums text-slate-700">
                      {formatBDT(sale.grossSale)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono tabular-nums text-slate-500">
                      {formatBDT(sale.salesDiscount)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono tabular-nums font-semibold text-rose-700">
                      {sale.oldBatteryBuybackAmount > 0
                        ? `-${formatBDT(sale.oldBatteryBuybackAmount)}`
                        : '৳0'}
                    </td>
                    <td className="py-3 px-3 text-right font-mono tabular-nums font-medium text-emerald-700">
                      {formatBDT(sale.paidAmount)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono tabular-nums font-medium text-rose-600">
                      {sale.dueAmount > 0 ? formatBDT(sale.dueAmount) : '৳0'}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className="font-mono text-[10px] px-1.5 py-0.5 bg-slate-100 rounded text-slate-700">
                        {sale.paymentMethod}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <StatusBadge status={sale.status} />
                    </td>
                    <td className="py-3 px-3 text-center text-slate-500 text-[11px]">
                      {sale.createdBy}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setSelectedInvoice(sale)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-slate-900 bg-amber-400 hover:bg-amber-300 rounded shadow-2xs transition-colors cursor-pointer"
                          title="রিসিট প্রিন্ট করুন (Print Receipt)"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          <span>রিসিট প্রিন্ট</span>
                        </button>
                        <button
                          onClick={() => setSelectedInvoice(sale)}
                          className="p-1 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded"
                          title="View Invoice"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {role === 'ADMIN' && sale.status !== 'Voided' && (
                          <button
                            onClick={() => setVoidTarget(sale)}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded"
                            title="Void / Reverse Transaction"
                          >
                            <Ban className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile View Card List */}
        <div className="sm:hidden divide-y divide-slate-100">
          {sales.map((sale) => (
            <div key={sale.id} className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-mono font-bold text-xs text-slate-900 block">
                    #{sale.invoiceNo}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {formatDateTime(sale.date)}
                  </span>
                </div>
                <StatusBadge status={sale.status} />
              </div>

              <div className="flex items-center justify-between text-xs">
                <div>
                  <span className="font-semibold text-slate-800 block">{sale.customerName}</span>
                  {sale.customerPhone && (
                    <span className="text-[10px] text-slate-400 font-mono">{sale.customerPhone}</span>
                  )}
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 block">নিট বিক্রয়</span>
                  <span className="font-mono font-bold text-slate-900">{formatBDT(sale.netPayable)}</span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 bg-slate-50 p-2 rounded-lg text-center text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 block">পরিশোধ</span>
                  <span className="font-mono font-bold text-emerald-700">{formatBDT(sale.paidAmount)}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">বকেয়া</span>
                  <span className="font-mono font-bold text-rose-600">{formatBDT(sale.dueAmount)}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">পদ্ধতি</span>
                  <span className="font-mono font-medium text-slate-700">{sale.paymentMethod}</span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <span className="text-[10px] text-slate-400">বিক্রেতা: {sale.createdBy}</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setSelectedInvoice(sale)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-lg shadow-2xs"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>রিসিট প্রিন্ট</span>
                  </button>
                  <button
                    onClick={() => setSelectedInvoice(sale)}
                    className="p-1.5 text-slate-500 hover:text-slate-800 rounded"
                    title="চালান দেখুন"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Invoice Viewer Modal */}
      <InvoiceModal
        isOpen={!!selectedInvoice}
        sale={selectedInvoice}
        onClose={() => setSelectedInvoice(null)}
      />

      {/* Void Confirmation Modal */}
      <ConfirmationModal
        isOpen={!!voidTarget}
        title={`Void Invoice #${voidTarget?.invoiceNo}`}
        message={`Are you sure you want to void this transaction of net value ${formatBDT(
          voidTarget?.netPayable
        )}? This financial action will be recorded in the audit trail.`}
        warningNote="Voiding this transaction will create a reversal entry in the backend ledger in Step 2. Financial records are never permanently erased."
        confirmLabel="Void Invoice"
        requireReason={true}
        reasonPlaceholder="e.g. Customer canceled order before dispatch or duplicate cashier entry"
        onConfirm={handleConfirmVoid}
        onClose={() => setVoidTarget(null)}
      />
    </div>
  );
};
