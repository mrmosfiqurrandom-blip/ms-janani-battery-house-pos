import React, { useState, useEffect } from 'react';
import { supplierService } from '../services/supplierService';
import { purchaseService } from '../services/purchaseService';
import { commissionService } from '../services/commissionService';
import { Supplier, Purchase, SupplierCommission } from '../types';
import { formatBDT } from '../utils/formatters';
import { StatusBadge } from '../components/StatusBadge';
import { useToast } from '../context/ToastContext';
import { Search, Plus, Eye, Building2, Phone, CreditCard, ArrowRight, BookOpen } from 'lucide-react';
import { Link } from 'react-router-dom';

export const SuppliersPage: React.FC = () => {
  const { success, error } = useToast();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Details
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [supplierPurchases, setSupplierPurchases] = useState<Purchase[]>([]);

  // Add Supplier Modal
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newSup, setNewSup] = useState({
    name: '',
    contactPerson: '',
    phone: '',
    email: '',
    address: '',
    openingBalance: 0,
    creditLimit: 300000,
    notes: '',
    status: 'ACTIVE' as const,
  });

  useEffect(() => {
    setLoading(true);
    const unsub = supplierService.subscribeSuppliers(
      (data) => {
        setSuppliers(data);
        setLoading(false);
      },
      () => setLoading(false)
    );
    return () => unsub();
  }, []);

  const handleOpenDetails = async (s: Supplier) => {
    setSelectedSupplier(s);
    const allPurchases = await purchaseService.getPurchases();
    setSupplierPurchases(allPurchases.filter((p) => p.supplierId === s.id));
  };

  const handleCreateSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSup.name.trim() || !newSup.phone.trim()) {
      error('Supplier Name and Phone are required.');
      return;
    }
    try {
      await supplierService.createSupplier(newSup);
      success('Supplier Created', `${newSup.name} added to supply directory`);
      setIsAddOpen(false);
      setNewSup({
        name: '',
        contactPerson: '',
        phone: '',
        email: '',
        address: '',
        openingBalance: 0,
        creditLimit: 300000,
        notes: '',
        status: 'ACTIVE',
      });
    } catch {
      error('Failed to create supplier');
    }
  };

  const filtered = suppliers.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.contactPerson.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Suppliers & Manufacturers</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage factory vendors, purchase payable liabilities, and rebate track records
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/supplier-ledger"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-900 bg-amber-400 hover:bg-amber-300 rounded-md transition-colors shadow-2xs"
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>আধুনিক লেজার (Ledger)</span>
          </Link>
          <button
            onClick={() => setIsAddOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-md transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add New Supplier</span>
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white p-3.5 rounded-lg border border-slate-200 shadow-xs">
        <div className="relative max-w-sm">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search by supplier name or contact person..."
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
                <th className="py-3 px-4">Supplier Name</th>
                <th className="py-3 px-3">Contact Person & Phone</th>
                <th className="py-3 px-3 text-right">Total Purchased</th>
                <th className="py-3 px-3 text-right">Total Paid</th>
                <th className="py-3 px-3 text-right text-amber-600 font-bold">Purchase Payable Due</th>
                <th className="py-3 px-3 text-right text-emerald-700 font-bold">Commission Due</th>
                <th className="py-3 px-3 text-center">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    Loading suppliers...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    No suppliers found matching search.
                  </td>
                </tr>
              ) : (
                filtered.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4 font-semibold text-slate-900">
                      <div>{s.name}</div>
                      {s.address && (
                        <span className="text-[10px] text-slate-400 font-normal truncate block max-w-xs">
                          {s.address}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-slate-600">
                      <div>{s.contactPerson}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{s.phone}</div>
                    </td>
                    <td className="py-3 px-3 text-right font-mono tabular-nums text-slate-900">
                      {formatBDT(s.totalPurchased)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono tabular-nums text-emerald-700">
                      {formatBDT(s.totalPaid)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono tabular-nums font-bold text-amber-600">
                      {formatBDT(s.currentDue)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono tabular-nums font-bold text-emerald-700">
                      {formatBDT(s.commissionDueTotal || 0)}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <StatusBadge status={s.status} />
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => handleOpenDetails(s)}
                        className="px-2 py-1 text-xs text-slate-700 hover:bg-slate-100 rounded inline-flex items-center gap-1"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Ledger</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Supplier Details Modal */}
      {selectedSupplier && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-lg border border-slate-200 shadow-2xl max-w-2xl w-full p-6 text-xs max-h-[90vh] flex flex-col">
            <div className="flex items-start justify-between pb-3 border-b border-slate-200">
              <div>
                <h3 className="text-base font-bold text-slate-900">{selectedSupplier.name}</h3>
                <p className="text-slate-500 text-xs">
                  {selectedSupplier.contactPerson} · Phone: {selectedSupplier.phone}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedSupplier(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            {/* Separate Payable vs Commission balances */}
            <div className="grid grid-cols-2 gap-3 my-4">
              <div className="p-3 bg-amber-50 rounded border border-amber-200">
                <span className="text-[10px] text-amber-800 uppercase font-bold block">
                  Supplier Purchase Payable (Bills We Owe)
                </span>
                <span className="font-mono font-bold text-base text-amber-700">
                  {formatBDT(selectedSupplier.currentDue)}
                </span>
              </div>
              <div className="p-3 bg-emerald-50 rounded border border-emerald-200">
                <span className="text-[10px] text-emerald-800 uppercase font-bold block">
                  Supplier Commission Receivable (Rebate Owed To Us)
                </span>
                <span className="font-mono font-bold text-base text-emerald-700">
                  {formatBDT(selectedSupplier.commissionDueTotal || 0)}
                </span>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              <span className="font-bold text-slate-800 block mb-2">Purchase Orders</span>
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-400 text-[10px] font-semibold">
                    <th className="pb-1">Purchase No</th>
                    <th className="pb-1">Total</th>
                    <th className="pb-1 text-right">Paid</th>
                    <th className="pb-1 text-right text-amber-600">Due</th>
                    <th className="pb-1 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {supplierPurchases.map((p) => (
                    <tr key={p.id}>
                      <td className="py-2 font-mono font-bold">{p.purchaseNo}</td>
                      <td className="py-2 font-mono tabular-nums">{formatBDT(p.total)}</td>
                      <td className="py-2 text-right font-mono tabular-nums text-emerald-700">
                        {formatBDT(p.paidAmount)}
                      </td>
                      <td className="py-2 text-right font-mono tabular-nums font-semibold text-amber-600">
                        {formatBDT(p.dueAmount)}
                      </td>
                      <td className="py-2 text-center">
                        <StatusBadge status={p.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-200 flex justify-between items-center">
              <Link
                to="/supplier-payments"
                className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded text-xs"
              >
                Make Bill Settlement
              </Link>
              <button
                type="button"
                onClick={() => setSelectedSupplier(null)}
                className="px-4 py-1.5 text-slate-700 bg-slate-100 hover:bg-slate-200 rounded"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Supplier Modal */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-lg border border-slate-200 shadow-xl max-w-md w-full p-5 text-xs">
            <h3 className="text-sm font-bold text-slate-900 mb-3">Add Supplier / Factory</h3>
            <form onSubmit={handleCreateSupplier} className="space-y-3">
              <div>
                <label className="block text-slate-700 font-medium mb-1">
                  Supplier / Company Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newSup.name}
                  onChange={(e) => setNewSup({ ...newSup, name: e.target.value })}
                  placeholder="e.g. Navana Batteries Ltd"
                  className="w-full p-2 border border-slate-300 rounded"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Contact Person</label>
                  <input
                    type="text"
                    value={newSup.contactPerson}
                    onChange={(e) => setNewSup({ ...newSup, contactPerson: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-medium mb-1">
                    Phone <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={newSup.phone}
                    onChange={(e) => setNewSup({ ...newSup, phone: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">Office Address</label>
                <input
                  type="text"
                  value={newSup.address}
                  onChange={(e) => setNewSup({ ...newSup, address: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded"
                />
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
                  Save Supplier
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
