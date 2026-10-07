import React, { useState, useEffect } from 'react';
import { paymentService } from '../services/paymentService';
import { customerService } from '../services/customerService';
import { accountService } from '../services/accountService';
import { CustomerPayment, Customer, Account, PaymentMethod } from '../types';
import { formatBDT, formatDateTime } from '../utils/formatters';
import { useToast } from '../context/ToastContext';
import { Plus, CreditCard, Search } from 'lucide-react';

export const CustomerPaymentsPage: React.FC = () => {
  const { success, error } = useToast();
  const [payments, setPayments] = useState<CustomerPayment[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [customerId, setCustomerId] = useState('');
  const [amount, setAmount] = useState<number>(5000);
  const [accountId, setAccountId] = useState('acc-1');
  const [method, setMethod] = useState<PaymentMethod>('CASH');
  const [ref, setRef] = useState('');
  const [notes, setNotes] = useState('Counter payment for due clearance');

  useEffect(() => {
    loadData();

    const unsubPayments = paymentService.subscribeCustomerPayments((pmts) => setPayments(pmts));
    const unsubCusts = customerService.subscribeCustomers((custs) => {
      setCustomers(custs);
      if (custs.length > 0 && !customerId) setCustomerId(custs[0].id);
    });

    return () => {
      unsubPayments();
      unsubCusts();
    };
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [pmts, custs, accs] = await Promise.all([
        paymentService.getCustomerPayments(),
        customerService.getCustomers(),
        accountService.getAccounts(),
      ]);
      setPayments(pmts);
      setCustomers(custs);
      setAccounts(accs);
      if (custs.length > 0) setCustomerId(custs[0].id);
    } catch {
      error('Failed to load customer payment records');
    } finally {
      setLoading(false);
    }
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    const cust = customers.find((c) => c.id === customerId);
    if (!cust || amount <= 0) {
      error('Please specify valid customer and positive payment amount.');
      return;
    }

    try {
      await paymentService.createCustomerPayment({
        customerId: cust.id,
        customerName: cust.name,
        date: new Date().toISOString(),
        amount,
        accountId,
        paymentMethod: method,
        reference: ref,
        notes,
      });

      // Update customer due in mock state
      await customerService.updateCustomer(cust.id, {
        totalPaid: cust.totalPaid + amount,
        currentDue: Math.max(0, cust.currentDue - amount),
      });

      success('Payment Recorded', `Received ${formatBDT(amount)} from ${cust.name}`);
      setIsModalOpen(false);
      setRef('');
      loadData();
    } catch {
      error('Failed to record customer payment');
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Customer Collections & Due Receipts</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Record counter cash, bank deposits, and mobile money collections clearing customer dues
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-md transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Receive Customer Payment</span>
        </button>
      </div>

      {/* Payments Table */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-4">Receipt No</th>
                <th className="py-3 px-3">Date</th>
                <th className="py-3 px-3">Customer</th>
                <th className="py-3 px-3 text-right">Amount Received</th>
                <th className="py-3 px-3 text-center">Method</th>
                <th className="py-3 px-3">Reference</th>
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
                  <td className="py-3 px-3 font-semibold text-slate-800">{p.customerName}</td>
                  <td className="py-3 px-3 text-right font-mono tabular-nums font-bold text-emerald-700">
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

      {/* Record Payment Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-lg border border-slate-200 shadow-xl max-w-md w-full p-5 text-xs">
            <h3 className="text-sm font-bold text-slate-900 mb-3">Record Customer Payment</h3>
            <form onSubmit={handleRecordPayment} className="space-y-3">
              <div>
                <label className="block text-slate-700 font-medium mb-1">Customer</label>
                <select
                  value={customerId}
                  onChange={(e) => setCustomerId(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded"
                >
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.currentDue > 0 ? `(Due: ৳${c.currentDue})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">Received Amount (৳)</label>
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
                  <label className="block text-slate-700 font-medium mb-1">Deposit Method</label>
                  <select
                    value={method}
                    onChange={(e) => setMethod(e.target.value as PaymentMethod)}
                    className="w-full p-2 border border-slate-300 rounded"
                  >
                    <option value="CASH">Cash Drawer</option>
                    <option value="BANK">Bank Deposit / BEFTN</option>
                    <option value="BKASH">bKash Merchant</option>
                    <option value="NAGAD">Nagad</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Credited Account</label>
                  <select
                    value={accountId}
                    onChange={(e) => setAccountId(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded"
                  >
                    {accounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">
                  Bank Reference / Slip / TrxID
                </label>
                <input
                  type="text"
                  value={ref}
                  onChange={(e) => setRef(e.target.value)}
                  placeholder="e.g. Trx-991204 / Cheque #8812"
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
                  Confirm Receipt
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
