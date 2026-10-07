import React, { useState, useEffect } from 'react';
import { expenseService } from '../services/expenseService';
import { accountService } from '../services/accountService';
import { Expense, ExpenseCategory, Account, PaymentMethod } from '../types';
import { formatBDT, formatDateTime } from '../utils/formatters';
import { useToast } from '../context/ToastContext';
import { Receipt, Plus, Filter, Search } from 'lucide-react';

const CATEGORIES: ExpenseCategory[] = [
  'Rent',
  'Electricity',
  'Salary',
  'Transport',
  'Repair',
  'Maintenance',
  'Delivery',
  'Marketing',
  'Bank Charge',
  'Mobile/Phone',
  'Office Expense',
  'Other',
];

export const ExpensesPage: React.FC = () => {
  const { success, error } = useToast();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categoryFilter, setCategoryFilter] = useState<ExpenseCategory | 'ALL'>('ALL');
  const [loading, setLoading] = useState(true);

  // Add Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [cat, setCat] = useState<ExpenseCategory>('Electricity');
  const [desc, setDesc] = useState('');
  const [amount, setAmount] = useState<number>(1000);
  const [accId, setAccId] = useState('acc-1');
  const [method, setMethod] = useState<PaymentMethod>('CASH');
  const [ref, setRef] = useState('');

  useEffect(() => {
    setLoading(true);
    const unsub = expenseService.subscribeExpenses(
      (data) => {
        setExpenses(data);
        setLoading(false);
      },
      categoryFilter,
      () => setLoading(false)
    );
    accountService.getAccounts().then(setAccounts).catch(() => {});
    return () => unsub();
  }, [categoryFilter]);

  const handleCreateExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!desc.trim() || amount <= 0) {
      error('Description and positive amount are required.');
      return;
    }

    try {
      await expenseService.createExpense({
        date: new Date().toISOString(),
        category: cat,
        description: desc,
        amount,
        accountId: accId,
        paymentMethod: method,
        reference: ref,
      });

      success('Expense Logged', `${cat} expense of ${formatBDT(amount)} recorded.`);
      setIsModalOpen(false);
      setDesc('');
      setAmount(1000);
      setRef('');
    } catch {
      error('Failed to log expense');
    }
  };

  const totalExpense = expenses.reduce((acc, curr) => acc + curr.amount, 0);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Operating Expenses</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Track utilities, shop rent, transport fare and office operational overhead
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-md transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Record Expense</span>
        </button>
      </div>

      {/* Filter and summary bar */}
      <div className="bg-white p-3.5 rounded-lg border border-slate-200 shadow-xs flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value as any)}
            className="text-xs p-1.5 bg-slate-50 border border-slate-300 rounded font-medium text-slate-700"
          >
            <option value="ALL">All Categories</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <div className="text-right">
          <span className="text-[11px] text-slate-400 mr-2">Total Filtered:</span>
          <span className="text-sm font-bold font-mono text-rose-700">{formatBDT(totalExpense)}</span>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-4">Voucher No</th>
                <th className="py-3 px-3">Date</th>
                <th className="py-3 px-3">Category</th>
                <th className="py-3 px-3">Description</th>
                <th className="py-3 px-3 text-right">Amount</th>
                <th className="py-3 px-3 text-center">Method</th>
                <th className="py-3 px-4">Reference</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {expenses.map((exp) => (
                <tr key={exp.id} className="hover:bg-slate-50 transition-colors">
                  <td className="py-3 px-4 font-mono font-bold text-slate-900">{exp.expenseNo}</td>
                  <td className="py-3 px-3 text-slate-600 whitespace-nowrap">
                    {formatDateTime(exp.date)}
                  </td>
                  <td className="py-3 px-3 font-semibold text-slate-800">{exp.category}</td>
                  <td className="py-3 px-3 text-slate-600 max-w-sm truncate">{exp.description}</td>
                  <td className="py-3 px-3 text-right font-mono tabular-nums font-bold text-rose-700">
                    {formatBDT(exp.amount)}
                  </td>
                  <td className="py-3 px-3 text-center">
                    <span className="font-mono text-[10px] px-2 py-0.5 bg-slate-100 rounded text-slate-700">
                      {exp.paymentMethod}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">
                    {exp.reference || '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-lg border border-slate-200 shadow-xl max-w-md w-full p-5 text-xs">
            <h3 className="text-sm font-bold text-slate-900 mb-3">Record Shop Expense</h3>
            <form onSubmit={handleCreateExpense} className="space-y-3">
              <div>
                <label className="block text-slate-700 font-medium mb-1">Expense Category</label>
                <select
                  value={cat}
                  onChange={(e) => setCat(e.target.value as ExpenseCategory)}
                  className="w-full p-2 border border-slate-300 rounded"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">Description</label>
                <input
                  type="text"
                  required
                  value={desc}
                  onChange={(e) => setDesc(e.target.value)}
                  placeholder="e.g. September DESCO electricity bill / local van fare"
                  className="w-full p-2 border border-slate-300 rounded"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">Amount (৳)</label>
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
                    <option value="CASH">Cash Drawer</option>
                    <option value="BANK">City Bank A/C</option>
                    <option value="BKASH">bKash</option>
                    <option value="NAGAD">Nagad</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Debited Account</label>
                  <select
                    value={accId}
                    onChange={(e) => setAccId(e.target.value)}
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
                  Reference / Bill Number
                </label>
                <input
                  type="text"
                  value={ref}
                  onChange={(e) => setRef(e.target.value)}
                  placeholder="e.g. DESCO-992144"
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
                  Record Expense
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
