import React, { useState, useEffect } from 'react';
import { purchaseService } from '../services/purchaseService';
import { Purchase } from '../types';
import { formatBDT, formatDateTime } from '../utils/formatters';
import { StatusBadge } from '../components/StatusBadge';
import { useToast } from '../context/ToastContext';
import { Search, Plus, Eye, ShoppingBag } from 'lucide-react';
import { Link } from 'react-router-dom';

export const PurchasesPage: React.FC = () => {
  const { error } = useToast();
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedPurchase, setSelectedPurchase] = useState<Purchase | null>(null);

  useEffect(() => {
    setLoading(true);
    const unsub = purchaseService.subscribePurchases(
      (data) => {
        setPurchases(data);
        setLoading(false);
      },
      () => setLoading(false)
    );
    return () => unsub();
  }, []);

  const filtered = purchases.filter(
    (p) =>
      p.purchaseNo.toLowerCase().includes(search.toLowerCase()) ||
      p.supplierName.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Supplier Purchases</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Log inventory consignments, wholesale costs and accounts payable
          </p>
        </div>
        <Link
          to="/purchases/new"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-md transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Purchase Entry</span>
        </Link>
      </div>

      {/* Search */}
      <div className="bg-white p-3.5 rounded-lg border border-slate-200 shadow-xs">
        <div className="relative max-w-sm">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search by purchase number or supplier..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full text-xs pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded focus:bg-white focus:outline-hidden"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-4">Purchase No</th>
                <th className="py-3 px-3">Date</th>
                <th className="py-3 px-3">Supplier</th>
                <th className="py-3 px-3 text-right">Items Count</th>
                <th className="py-3 px-3 text-right">Total Amount</th>
                <th className="py-3 px-3 text-right">Paid</th>
                <th className="py-3 px-3 text-right">Payable Due</th>
                <th className="py-3 px-3 text-center">Status</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    Loading purchases...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    No purchase records found.
                  </td>
                </tr>
              ) : (
                filtered.map((pur) => (
                  <tr key={pur.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">
                      {pur.purchaseNo}
                    </td>
                    <td className="py-3 px-3 text-slate-600 whitespace-nowrap">
                      {formatDateTime(pur.date)}
                    </td>
                    <td className="py-3 px-3 font-semibold text-slate-800">
                      {pur.supplierName}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-slate-600">
                      {pur.items.length} SKUs
                    </td>
                    <td className="py-3 px-3 text-right font-mono tabular-nums font-bold text-slate-900">
                      {formatBDT(pur.total)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono tabular-nums text-emerald-700">
                      {formatBDT(pur.paidAmount)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono tabular-nums font-semibold text-amber-600">
                      {pur.dueAmount > 0 ? formatBDT(pur.dueAmount) : '৳0'}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <StatusBadge status={pur.status} />
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => setSelectedPurchase(pur)}
                        className="p-1 text-slate-500 hover:text-slate-900 rounded"
                        title="View Details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Purchase Details Modal */}
      {selectedPurchase && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-lg border border-slate-200 shadow-xl max-w-lg w-full p-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="text-sm font-bold text-slate-900">
                Purchase Order #{selectedPurchase.purchaseNo}
              </h3>
              <button
                type="button"
                onClick={() => setSelectedPurchase(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <div className="py-3 text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-500">Supplier:</span>
                <span className="font-bold text-slate-900">{selectedPurchase.supplierName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Date:</span>
                <span>{formatDateTime(selectedPurchase.date)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Payment Account:</span>
                <span className="font-mono">{selectedPurchase.paymentMethod}</span>
              </div>

              <div className="mt-3 border-t border-slate-200 pt-2">
                <span className="font-semibold block mb-1">Purchased Products:</span>
                <div className="space-y-1">
                  {selectedPurchase.items.map((it, idx) => (
                    <div key={idx} className="flex justify-between p-1.5 bg-slate-50 rounded">
                      <span>
                        {it.productName} ({it.quantity} {it.unit} @ {formatBDT(it.purchaseCost)})
                      </span>
                      <span className="font-mono font-bold">{formatBDT(it.total)}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-3 border-t border-slate-200 pt-2 space-y-1 text-right">
                <div className="flex justify-between">
                  <span>Total Amount:</span>
                  <span className="font-mono font-bold">{formatBDT(selectedPurchase.total)}</span>
                </div>
                <div className="flex justify-between text-emerald-700">
                  <span>Paid Amount:</span>
                  <span className="font-mono">{formatBDT(selectedPurchase.paidAmount)}</span>
                </div>
                <div className="flex justify-between text-amber-600 font-bold">
                  <span>Outstanding Due:</span>
                  <span className="font-mono">{formatBDT(selectedPurchase.dueAmount)}</span>
                </div>
              </div>
            </div>

            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedPurchase(null)}
                className="px-4 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
