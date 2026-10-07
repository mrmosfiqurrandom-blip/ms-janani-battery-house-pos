import React, { useState, useEffect } from 'react';
import { accountService } from '../services/accountService';
import { Account, AccountTransfer, AccountTransaction } from '../types';
import { formatBDT, formatDateTime } from '../utils/formatters';
import { StatusBadge } from '../components/StatusBadge';
import { useToast } from '../context/ToastContext';
import {
  Wallet,
  ArrowLeftRight,
  TrendingUp,
  TrendingDown,
  Building2,
  Plus,
  ArrowUpRight,
  ArrowDownLeft,
} from 'lucide-react';

export const AccountsPage: React.FC = () => {
  const { success, error } = useToast();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transfers, setTransfers] = useState<AccountTransfer[]>([]);
  const [transactions, setTransactions] = useState<AccountTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  // Transfer Modal
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [fromAccId, setFromAccId] = useState('');
  const [toAccId, setToAccId] = useState('');
  const [transferAmount, setTransferAmount] = useState<number>(10000);
  const [transferRef, setTransferRef] = useState('Counter cash deposit');
  const [transferNotes, setTransferNotes] = useState('Surplus retail cash moved to bank');

  useEffect(() => {
    loadData();

    const unsub = accountService.subscribeAccounts((accs) => {
      setAccounts(accs);
      if (accs.length >= 2 && !fromAccId) {
        setFromAccId(accs[0].id);
        setToAccId(accs[1].id);
      }
    });

    return () => unsub();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [accs, trfs, txns] = await Promise.all([
        accountService.getAccounts(),
        accountService.getTransfers(),
        accountService.getTransactions(),
      ]);
      setAccounts(accs);
      setTransfers(trfs);
      setTransactions(txns);
      if (accs.length >= 2) {
        setFromAccId(accs[0].id);
        setToAccId(accs[1].id);
      }
    } catch {
      error('Failed to load accounts');
    } finally {
      setLoading(false);
    }
  };

  const handleExecuteTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (fromAccId === toAccId) {
      error('Source and Destination accounts must be different.');
      return;
    }
    const fromAcc = accounts.find((a) => a.id === fromAccId);
    const toAcc = accounts.find((a) => a.id === toAccId);
    if (!fromAcc || !toAcc) return;

    if (transferAmount > fromAcc.balance) {
      error(`Insufficient funds in ${fromAcc.name} (Balance: ${formatBDT(fromAcc.balance)})`);
      return;
    }

    try {
      await accountService.createTransfer({
        date: new Date().toISOString(),
        fromAccountId: fromAcc.id,
        fromAccountName: fromAcc.name,
        toAccountId: toAcc.id,
        toAccountName: toAcc.name,
        amount: transferAmount,
        reference: transferRef,
        notes: transferNotes,
      });

      success(
        'Account Transfer Completed',
        `Moved ${formatBDT(transferAmount)} from ${fromAcc.name} to ${toAcc.name}`
      );
      setIsTransferModalOpen(false);
      loadData();
    } catch {
      error('Transfer failed');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Accounts & Liquid Fund Management
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time balances across Cash Drawer, Bank Accounts, bKash & Nagad
          </p>
        </div>
        <button
          onClick={() => setIsTransferModalOpen(true)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-md transition-colors"
        >
          <ArrowLeftRight className="w-3.5 h-3.5" />
          <span>New Account Transfer</span>
        </button>
      </div>

      {/* Account Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {accounts.map((acc) => (
          <div key={acc.id} className="bg-white p-5 rounded-lg border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-700">{acc.name}</span>
              <span className="text-[10px] font-mono font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                {acc.type}
              </span>
            </div>

            <p className="text-2xl font-bold text-slate-900 font-mono tabular-nums mt-1">
              {formatBDT(acc.balance)}
            </p>

            <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-2 gap-2 text-[11px]">
              <div>
                <span className="text-slate-400 block">Total In</span>
                <span className="font-mono text-emerald-700 font-semibold tabular-nums">
                  {formatBDT(acc.totalIn)}
                </span>
              </div>
              <div className="text-right">
                <span className="text-slate-400 block">Total Out</span>
                <span className="font-mono text-slate-600 font-semibold tabular-nums">
                  {formatBDT(acc.totalOut)}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Transfer History Table */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <ArrowLeftRight className="w-4 h-4 text-slate-500" />
            <h2 className="text-xs font-bold uppercase tracking-wide text-slate-700">
              Inter-Account Fund Transfers (Neutral Non-Expense)
            </h2>
          </div>
          <span className="text-[11px] text-slate-400">
            Internal liquidity shifts between cash, banks & wallets
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-4">Transfer No</th>
                <th className="py-3 px-3">Date</th>
                <th className="py-3 px-3">From Source</th>
                <th className="py-3 px-3">To Destination</th>
                <th className="py-3 px-3 text-right">Amount</th>
                <th className="py-3 px-3">Reference</th>
                <th className="py-3 px-4">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {transfers.map((t) => (
                <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                  <td className="py-3 px-4 font-mono font-bold text-slate-900">{t.transferNo}</td>
                  <td className="py-3 px-3 text-slate-600 whitespace-nowrap">
                    {formatDateTime(t.date)}
                  </td>
                  <td className="py-3 px-3 font-medium text-rose-700">{t.fromAccountName}</td>
                  <td className="py-3 px-3 font-medium text-emerald-700">{t.toAccountName}</td>
                  <td className="py-3 px-3 text-right font-mono tabular-nums font-bold text-slate-900">
                    {formatBDT(t.amount)}
                  </td>
                  <td className="py-3 px-3 font-mono text-[11px] text-slate-600">
                    {t.reference || '-'}
                  </td>
                  <td className="py-3 px-4 text-slate-500 text-[11px] max-w-xs truncate">
                    {t.notes}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Account Transactions Ledger */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200 font-bold text-xs text-slate-700 uppercase tracking-wide">
          Recent Liquid Fund Movements
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-3">Account</th>
                <th className="py-3 px-3">Category</th>
                <th className="py-3 px-3">Description</th>
                <th className="py-3 px-3 text-right">Amount</th>
                <th className="py-3 px-4 text-right">Balance After</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {transactions.map((tx) => (
                <tr key={tx.id} className="hover:bg-slate-50 transition-colors">
                  <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                    {formatDateTime(tx.date)}
                  </td>
                  <td className="py-3 px-3 font-medium text-slate-800">{tx.accountName}</td>
                  <td className="py-3 px-3 text-slate-600">{tx.category}</td>
                  <td className="py-3 px-3 text-slate-500 max-w-sm truncate">{tx.description}</td>
                  <td className="py-3 px-3 text-right font-mono tabular-nums font-bold">
                    <span
                      className={
                        tx.type === 'IN' || tx.type === 'TRANSFER_IN'
                          ? 'text-emerald-700'
                          : 'text-rose-700'
                      }
                    >
                      {tx.type === 'IN' || tx.type === 'TRANSFER_IN' ? '+' : '-'}
                      {formatBDT(tx.amount)}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-900 font-semibold">
                    {formatBDT(tx.balanceAfter)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* New Transfer Modal */}
      {isTransferModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-lg border border-slate-200 shadow-xl max-w-md w-full p-5 text-xs">
            <h3 className="text-sm font-bold text-slate-900 mb-1">Inter-Account Fund Transfer</h3>
            <p className="text-[11px] text-slate-500 mb-4">
              Transfers shift balances between accounts without affecting business revenue or
              expenses.
            </p>

            <form onSubmit={handleExecuteTransfer} className="space-y-3">
              <div>
                <label className="block text-slate-700 font-medium mb-1">From Source Account</label>
                <select
                  value={fromAccId}
                  onChange={(e) => setFromAccId(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded"
                >
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} (Balance: {formatBDT(a.balance)})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">To Destination Account</label>
                <select
                  value={toAccId}
                  onChange={(e) => setToAccId(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded"
                >
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} (Balance: {formatBDT(a.balance)})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">Transfer Amount (৳)</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={transferAmount}
                  onChange={(e) => setTransferAmount(Number(e.target.value) || 0)}
                  className="w-full p-2 border border-slate-300 rounded font-mono font-bold"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">
                  Slip Reference / Cheque
                </label>
                <input
                  type="text"
                  value={transferRef}
                  onChange={(e) => setTransferRef(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">Notes</label>
                <input
                  type="text"
                  value={transferNotes}
                  onChange={(e) => setTransferNotes(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded"
                />
              </div>

              <div className="mt-5 flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsTransferModalOpen(false)}
                  className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 font-semibold text-white bg-slate-900 rounded"
                >
                  Execute Transfer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
