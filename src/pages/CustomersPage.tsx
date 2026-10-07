import React, { useState, useEffect } from 'react';
import { customerService } from '../services/customerService';
import { salesService } from '../services/salesService';
import { paymentService } from '../services/paymentService';
import { Customer, Sale, CustomerPayment } from '../types';
import { formatBDT, formatDateTime } from '../utils/formatters';
import { StatusBadge } from '../components/StatusBadge';
import { useToast } from '../context/ToastContext';
import { Search, Plus, Eye, Phone, CreditCard, ArrowRight, Printer } from 'lucide-react';
import { Link } from 'react-router-dom';

export const CustomersPage: React.FC = () => {
  const { success, error } = useToast();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Details Modal
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerSales, setCustomerSales] = useState<Sale[]>([]);

  // Add Customer Modal
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newCust, setNewCust] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    openingBalance: 0,
    creditLimit: 50000,
    notes: '',
    status: 'ACTIVE' as const,
  });

  useEffect(() => {
    setLoading(true);
    const unsub = customerService.subscribeCustomers(
      (data) => {
        setCustomers(data);
        setLoading(false);
      },
      () => setLoading(false)
    );
    return () => unsub();
  }, []);

  const handleOpenDetails = async (c: Customer) => {
    setSelectedCustomer(c);
    const sales = await salesService.getSales({ customerId: c.id });
    setCustomerSales(sales);
  };

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCust.name.trim() || !newCust.phone.trim()) {
      error('Customer Name and Phone are required.');
      return;
    }
    try {
      await customerService.createCustomer(newCust);
      success('Customer Added', `${newCust.name} added to ledger`);
      setIsAddOpen(false);
      setNewCust({
        name: '',
        phone: '',
        email: '',
        address: '',
        openingBalance: 0,
        creditLimit: 50000,
        notes: '',
        status: 'ACTIVE',
      });
    } catch {
      error('Failed to create customer');
    }
  };

  const filtered = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.phone.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Customer Directory & Credit Ledgers</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage wholesale clients, fleet operators, credit limits and receivables
          </p>
        </div>
        <button
          onClick={() => setIsAddOpen(true)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-md transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add New Customer</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="bg-white p-3.5 rounded-lg border border-slate-200 shadow-xs">
        <div className="relative max-w-sm">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search by customer name or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full text-xs pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded focus:bg-white focus:outline-hidden"
          />
        </div>
      </div>

      {/* Customers Table */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-4">Customer Name</th>
                <th className="py-3 px-3">Contact Phone</th>
                <th className="py-3 px-3 text-right">Credit Limit</th>
                <th className="py-3 px-3 text-right">Total Purchased</th>
                <th className="py-3 px-3 text-right">Total Paid</th>
                <th className="py-3 px-3 text-right text-rose-600 font-bold">Current Due</th>
                <th className="py-3 px-3 text-center">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    Loading customer directory...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    No customers found matching search.
                  </td>
                </tr>
              ) : (
                filtered.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4 font-semibold text-slate-900">
                      <div>{c.name}</div>
                      {c.address && (
                        <span className="text-[10px] text-slate-400 font-normal truncate block max-w-xs">
                          {c.address}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 font-mono text-slate-600">{c.phone}</td>
                    <td className="py-3 px-3 text-right font-mono tabular-nums text-slate-600">
                      {formatBDT(c.creditLimit)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono tabular-nums text-slate-900">
                      {formatBDT(c.totalPurchased)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono tabular-nums text-emerald-700">
                      {formatBDT(c.totalPaid)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono tabular-nums font-bold text-rose-600">
                      {formatBDT(c.currentDue)}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <StatusBadge status={c.status} />
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleOpenDetails(c)}
                          className="px-2 py-1 text-xs text-slate-700 hover:bg-slate-100 rounded inline-flex items-center gap-1"
                          title="View Ledger Statement"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Ledger</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Customer Details & Ledger Modal */}
      {selectedCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-lg border border-slate-200 shadow-2xl max-w-2xl w-full p-6 text-xs max-h-[90vh] flex flex-col">
            <div className="flex items-start justify-between pb-3 border-b border-slate-200">
              <div>
                <h3 className="text-base font-bold text-slate-900">{selectedCustomer.name}</h3>
                <p className="text-slate-500 text-xs">
                  Phone: {selectedCustomer.phone} · Address: {selectedCustomer.address || 'N/A'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedCustomer(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            {/* Balances */}
            <div className="grid grid-cols-3 gap-3 my-4">
              <div className="p-3 bg-slate-50 rounded border border-slate-200 text-center">
                <span className="text-[10px] text-slate-500 uppercase font-bold block">
                  Total Purchases
                </span>
                <span className="font-mono font-bold text-sm text-slate-900">
                  {formatBDT(selectedCustomer.totalPurchased)}
                </span>
              </div>
              <div className="p-3 bg-emerald-50 rounded border border-emerald-200 text-center">
                <span className="text-[10px] text-emerald-800 uppercase font-bold block">
                  Total Cleared
                </span>
                <span className="font-mono font-bold text-sm text-emerald-700">
                  {formatBDT(selectedCustomer.totalPaid)}
                </span>
              </div>
              <div className="p-3 bg-rose-50 rounded border border-rose-200 text-center">
                <span className="text-[10px] text-rose-800 uppercase font-bold block">
                  Outstanding Due
                </span>
                <span className="font-mono font-bold text-sm text-rose-600">
                  {formatBDT(selectedCustomer.currentDue)}
                </span>
              </div>
            </div>

            {/* Invoices History */}
            <div className="flex-1 overflow-y-auto">
              <span className="font-bold text-slate-800 block mb-2">Transaction Invoices</span>
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-400 text-[10px] font-semibold">
                    <th className="pb-1">Invoice</th>
                    <th className="pb-1">Date</th>
                    <th className="pb-1 text-right">Gross</th>
                    <th className="pb-1 text-right text-rose-700">Buyback</th>
                    <th className="pb-1 text-right">Net Payable</th>
                    <th className="pb-1 text-right">Paid</th>
                    <th className="pb-1 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {customerSales.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-4 text-center text-slate-400">
                        No sales found for this customer.
                      </td>
                    </tr>
                  ) : (
                    customerSales.map((s) => (
                      <tr key={s.id}>
                        <td className="py-2 font-mono font-bold">{s.invoiceNo}</td>
                        <td className="py-2 text-slate-500">{formatDateTime(s.date)}</td>
                        <td className="py-2 text-right font-mono tabular-nums">{formatBDT(s.grossSale)}</td>
                        <td className="py-2 text-right font-mono tabular-nums text-rose-700">
                          {s.oldBatteryBuybackAmount > 0
                            ? `-${formatBDT(s.oldBatteryBuybackAmount)}`
                            : '-'}
                        </td>
                        <td className="py-2 text-right font-mono tabular-nums font-semibold">
                          {formatBDT(s.netPayable)}
                        </td>
                        <td className="py-2 text-right font-mono tabular-nums text-emerald-700">
                          {formatBDT(s.paidAmount)}
                        </td>
                        <td className="py-2 text-center">
                          <StatusBadge status={s.status} />
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-200 flex justify-between items-center">
              <Link
                to="/customer-payments"
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded text-xs inline-flex items-center gap-1"
              >
                <CreditCard className="w-3.5 h-3.5" />
                <span>Receive Due Payment</span>
              </Link>
              <button
                type="button"
                onClick={() => setSelectedCustomer(null)}
                className="px-4 py-1.5 text-slate-700 bg-slate-100 hover:bg-slate-200 rounded"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Customer Modal */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-lg border border-slate-200 shadow-xl max-w-md w-full p-5 text-xs">
            <h3 className="text-sm font-bold text-slate-900 mb-3">Add Customer Account</h3>
            <form onSubmit={handleCreateCustomer} className="space-y-3">
              <div>
                <label className="block text-slate-700 font-medium mb-1">
                  Customer / Business Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newCust.name}
                  onChange={(e) => setNewCust({ ...newCust, name: e.target.value })}
                  placeholder="e.g. Al-Amin Battery House"
                  className="w-full p-2 border border-slate-300 rounded"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-medium mb-1">
                    Phone <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={newCust.phone}
                    onChange={(e) => setNewCust({ ...newCust, phone: e.target.value })}
                    placeholder="e.g. +880 1711-..."
                    className="w-full p-2 border border-slate-300 rounded font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Email</label>
                  <input
                    type="email"
                    value={newCust.email}
                    onChange={(e) => setNewCust({ ...newCust, email: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">Address</label>
                <input
                  type="text"
                  value={newCust.address}
                  onChange={(e) => setNewCust({ ...newCust, address: e.target.value })}
                  placeholder="e.g. Joydebpur, Gazipur"
                  className="w-full p-2 border border-slate-300 rounded"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-medium mb-1">
                    Opening Due Balance (৳)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={newCust.openingBalance}
                    onChange={(e) =>
                      setNewCust({ ...newCust, openingBalance: Number(e.target.value) || 0 })
                    }
                    className="w-full p-2 border border-slate-300 rounded font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-medium mb-1">
                    Credit Limit (৳)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={newCust.creditLimit}
                    onChange={(e) =>
                      setNewCust({ ...newCust, creditLimit: Number(e.target.value) || 0 })
                    }
                    className="w-full p-2 border border-slate-300 rounded font-mono"
                  />
                </div>
              </div>

              <div className="mt-5 flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 font-semibold text-white bg-slate-900 rounded"
                >
                  Save Customer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
