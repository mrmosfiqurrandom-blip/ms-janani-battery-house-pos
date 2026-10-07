import React, { useState, useEffect } from 'react';
import { paymentService } from '../services/paymentService';
import { supplierService } from '../services/supplierService';
import { accountService } from '../services/accountService';
import { SupplierPayment, Supplier, Account, PaymentMethod } from '../types';
import { formatBDT, formatDateTime } from '../utils/formatters';
import { useToast } from '../context/ToastContext';
import { Plus } from 'lucide-react';

export const SupplierPaymentsPage: React.FC = () => {
  const { success, error } = useToast();
  const [payments, setPayments] = useState<SupplierPayment[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [supplierId, setSupplierId] = useState('');
  const [amount, setAmount] = useState<number>(10000);
  const [accountId, setAccountId] = useState('acc-2');
  const [method, setMethod] = useState<PaymentMethod>('BANK');
  const [ref, setRef] = useState('');
  const [notes, setNotes] = useState('Payment against pending consignment invoices');

  useEffect(() => {
    loadData();

    const unsubPayments = paymentService.subscribeSupplierPayments((pmts) => setPayments(pmts));
    const unsubSups = supplierService.subscribeSuppliers((sups) => {
      setSuppliers(sups);
      if (sups.length > 0 && !supplierId) setSupplierId(sups[0].id);
    });

    return () => {
      unsubPayments();
      unsubSups();
    };
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [pmts, sups, accs] = await Promise.all([
        paymentService.getSupplierPayments(),
        supplierService.getSuppliers(),
        accountService.getAccounts(),
      ]);
      setPayments(pmts);
      setSuppliers(sups);
      setAccounts(accs);
      if (sups.length > 0) setSupplierId(sups[0].id);
    } catch {
      error('Failed to load supplier payment records');
    } finally {
      setLoading(false);
    }
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    const sup = suppliers.find((s) => s.id === supplierId);
    if (!sup || amount <= 0) {
      error('Please select valid supplier and positive payment amount.');
      return;
    }

    try {
      await paymentService.createSupplierPayment({
        supplierId: sup.id,
        supplierName: sup.name,
        date: new Date().toISOString(),
        amount,
        accountId,
        paymentMethod: method,
        reference: ref,
        notes,
      });

      // Update supplier due in mock state
      await supplierService.updateSupplier(sup.id, {
        totalPaid: sup.totalPaid + amount,
        currentDue: Math.max(0, sup.currentDue - amount),
      });

      success('Payment Recorded', `Disbursed ${formatBDT(amount)} to ${sup.name}`);
      setIsModalOpen(false);
      loadData();
    } catch {
      error('Failed to record supplier payment');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Supplier Bill Payments & Settlements</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Record bank transfers, cheques and cash paid to manufacturers for inventory stock
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-md transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Record Supplier Payment</span>
        </button>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-4">Voucher No</th>
                <th className="py-3 px-3">Date</th>
                <th className="py-3 px-3">Supplier Name</th>
                <th className="py-3 px-3 text-right">Amount Disbursed</th>
                <th className="py-3 px-3 text-center">Payment Method</th>
                <th className="py-3 px-3">Reference / Cheque</th>
                <th className="py-3 px-4">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {payments.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                  <td className="py-3 px-4 font-mono font-bold text-slate-900">{p.paymentNo}</td>
                  <td className="py-3 px-3 text-slate-600 whitespace-nowrap">
                    {formatDateTime(p.date)}
                  </td>
                  <td className="py-3 px-3 font-semibold text-slate-800">{p.supplierName}</td>
                  <td className="py-3 px-3 text-right font-mono tabular-nums font-bold text-amber-600">
                    {formatBDT(p.amount)}
                  </td>
                  <td className="py-3 px-3 text-center">
                    <span className="font-mono text-[10px] px-2 py-0.5 bg-slate-100 rounded text-slate-700">
                      {p.paymentMethod}
                    </span>
                  </td>
                  <td className="py-3 px-3 font-mono text-[11px] text-slate-600">
                    {p.reference || '-'}
                  </td>
                  <td className="py-3 px-4 text-slate-500 text-[11px] max-w-xs truncate">
                    {p.notes || '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-lg border border-slate-200 shadow-xl max-w-md w-full p-5 text-xs">
            <h3 className="text-sm font-bold text-slate-900 mb-3">Record Supplier Payment</h3>
            <form onSubmit={handleRecordPayment} className="space-y-3">
              <div>
                <label className="block text-slate-700 font-medium mb-1">Supplier</label>
                <select
                  value={supplierId}
                  onChange={(e) => setSupplierId(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded"
                >
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} (Due: {formatBDT(s.currentDue)})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">Payment Amount (৳)</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={amount}
                  onChange={(e) => setAmount(Number(e.target.value) || 0)}
                  className="w-full p-2 border border-slate-300 rounded font-mono font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Payment Method</label>
                  <select
                    value={method}
                    onChange={(e) => setMethod(e.target.value as PaymentMethod)}
                    className="w-full p-2 border border-slate-300 rounded"
                  >
                    <option value="BANK">Bank RTGS / BEFTN</option>
                    <option value="CASH">Cash Drawer</option>
                    <option value="BKASH">bKash</option>
                    <option value="NAGAD">Nagad</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Debited Account</label>
                  <select
                    value={accountId}
                    onChange={(e) => setAccountId(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded"
                  >
                    {accounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name} ({formatBDT(a.balance)})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">
                  Bank Reference / Cheque No
                </label>
                <input
                  type="text"
                  value={ref}
                  onChange={(e) => setRef(e.target.value)}
                  placeholder="e.g. RTGS-88410"
                  className="w-full p-2 border border-slate-300 rounded"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">Notes</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
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
                  Disburse Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
