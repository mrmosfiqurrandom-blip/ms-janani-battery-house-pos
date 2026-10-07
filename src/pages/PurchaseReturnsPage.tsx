import React, { useState, useEffect } from 'react';
import { returnsService } from '../services/returnsService';
import { PurchaseReturn } from '../types';
import { formatBDT, formatDateTime } from '../utils/formatters';
import { StatusBadge } from '../components/StatusBadge';
import { useToast } from '../context/ToastContext';
import { RotateCcw, Plus } from 'lucide-react';

export const PurchaseReturnsPage: React.FC = () => {
  const { success, error } = useToast();
  const [returns, setReturns] = useState<PurchaseReturn[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [purNo, setPurNo] = useState('VP-PUR-801');
  const [supName, setSupName] = useState('Rahimafrooz Distribution Ltd');
  const [prodName, setProdName] = useState('Rahimafrooz Globatt Car Battery 45Ah');
  const [qty, setQty] = useState(1);
  const [amount, setAmount] = useState(7200);
  const [reason, setReason] = useState('Damaged packaging during factory unloading');

  useEffect(() => {
    setLoading(true);
    const unsub = returnsService.subscribePurchaseReturns(
      (data) => {
        setReturns(data);
        setLoading(false);
      },
      () => setLoading(false)
    );
    return () => unsub();
  }, []);

  const handleRecordReturn = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await returnsService.createPurchaseReturn({
        purchaseInvoiceNo: purNo,
        date: new Date().toISOString(),
        supplierId: 'sup-1',
        supplierName: supName,
        productId: 'prd-3',
        productName: prodName,
        quantity: qty,
        returnAmount: amount,
        reason,
        status: 'COMPLETED',
      });
      success('Return Logged', 'Returned to supplier and credit adjusted.');
      setIsModalOpen(false);
    } catch {
      error('Failed to log purchase return');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Supplier Purchase Returns</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Record defect replacements, factory returns and vendor credit notes
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-md transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Supplier Return</span>
        </button>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-4">Return ID</th>
                <th className="py-3 px-3">Date</th>
                <th className="py-3 px-3">Purchase Order</th>
                <th className="py-3 px-3">Supplier</th>
                <th className="py-3 px-3">Product</th>
                <th className="py-3 px-3 text-right">Debit Adjustment</th>
                <th className="py-3 px-3 text-center">Status</th>
                <th className="py-3 px-4">Reason / Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {returns.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                  <td className="py-3 px-4 font-mono font-bold text-slate-900">{r.returnNo}</td>
                  <td className="py-3 px-3 text-slate-600 whitespace-nowrap">
                    {formatDateTime(r.date)}
                  </td>
                  <td className="py-3 px-3 font-mono text-slate-700">{r.purchaseInvoiceNo}</td>
                  <td className="py-3 px-3 font-medium text-slate-800">{r.supplierName}</td>
                  <td className="py-3 px-3 text-slate-900">
                    {r.productName} ({r.quantity} pcs)
                  </td>
                  <td className="py-3 px-3 text-right font-mono tabular-nums font-bold text-emerald-700">
                    {formatBDT(r.returnAmount)}
                  </td>
                  <td className="py-3 px-3 text-center">
                    <StatusBadge status={r.status} />
                  </td>
                  <td className="py-3 px-4 text-slate-500 max-w-xs truncate">{r.reason}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-lg border border-slate-200 shadow-xl max-w-md w-full p-5 text-xs">
            <h3 className="text-sm font-bold text-slate-900 mb-3">Record Supplier Return</h3>
            <form onSubmit={handleRecordReturn} className="space-y-3">
              <div>
                <label className="block text-slate-700 font-medium mb-1">
                  Purchase Invoice Number
                </label>
                <input
                  type="text"
                  required
                  value={purNo}
                  onChange={(e) => setPurNo(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">Supplier Name</label>
                <input
                  type="text"
                  required
                  value={supName}
                  onChange={(e) => setSupName(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">Product</label>
                <input
                  type="text"
                  required
                  value={prodName}
                  onChange={(e) => setProdName(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Quantity</label>
                  <input
                    type="number"
                    min="1"
                    value={qty}
                    onChange={(e) => setQty(Number(e.target.value) || 1)}
                    className="w-full p-2 border border-slate-300 rounded font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-medium mb-1">
                    Return Credit (৳)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={amount}
                    onChange={(e) => setAmount(Number(e.target.value) || 0)}
                    className="w-full p-2 border border-slate-300 rounded font-mono font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">Return Reason</label>
                <input
                  type="text"
                  required
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="e.g. Factory transit carton damage"
                  className="w-full p-2 border border-slate-300 rounded"
                />
              </div>

              <div className="mt-5 flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 font-semibold text-white bg-slate-900 rounded"
                >
                  Save Return
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
