import React, { useState, useEffect } from 'react';
import { productService } from '../services/productService';
import { inventoryService } from '../services/inventoryService';
import { Product, StockMovement, StockMovementType } from '../types';
import { formatBDT, formatDateTime } from '../utils/formatters';
import { StatusBadge } from '../components/StatusBadge';
import { useAuth } from '../context/AuthContext';
import { Layers, ArrowDownLeft, ArrowUpRight, Search, Filter, AlertTriangle, Loader2, EyeOff } from 'lucide-react';

export const StockPage: React.FC = () => {
  const { role } = useAuth();
  const isCashier = role === 'CASHIER';

  const [activeTab, setActiveTab] = useState<'SUMMARY' | 'LEDGER'>('SUMMARY');
  const [products, setProducts] = useState<Product[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<StockMovementType | 'ALL'>('ALL');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    // Real-time listener for products
    const unsubProducts = productService.subscribeProducts(
      (prods) => {
        setProducts(prods);
        setLoading(false);
      },
      (err) => console.error(err)
    );

    // Real-time listener for stock movements
    const unsubMovements = inventoryService.subscribeStockMovements(
      (moves) => {
        setMovements(moves);
      },
      typeFilter !== 'ALL' ? { type: typeFilter } : undefined
    );

    return () => {
      unsubProducts();
      unsubMovements();
    };
  }, [typeFilter]);

  const totalStockUnits = products.reduce((acc, p) => acc + p.currentStock, 0);
  const totalStockValuation = products.reduce((acc, p) => acc + p.currentStock * p.purchasePrice, 0);
  const totalRetailValuation = products.reduce((acc, p) => acc + p.currentStock * p.sellingPrice, 0);

  const filteredProducts = products.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.sku.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Page Title & Stats */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Inventory & Stock Ledger
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time warehouse balance from Firestore and movement audit logs
            {isCashier && (
              <span className="ml-2 inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-100 px-2 py-0.5 rounded">
                <EyeOff className="w-3 h-3" /> Cost valuations hidden for Cashier
              </span>
            )}
          </p>
        </div>

        {/* Tab switcher */}
        <div className="flex items-center bg-slate-200/80 p-0.5 rounded-lg text-xs font-semibold">
          <button
            onClick={() => setActiveTab('SUMMARY')}
            className={`px-3 py-1.5 rounded-md transition-colors ${
              activeTab === 'SUMMARY'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Current Stock Status
          </button>
          <button
            onClick={() => setActiveTab('LEDGER')}
            className={`px-3 py-1.5 rounded-md transition-colors ${
              activeTab === 'LEDGER'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Movement Audit Ledger
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className={`grid grid-cols-1 ${isCashier ? 'sm:grid-cols-2' : 'sm:grid-cols-3'} gap-4`}>
        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs">
          <span className="text-xs font-medium text-slate-500 block">Total Quantity on Hand</span>
          <p className="text-xl font-bold text-slate-900 font-mono tabular-nums mt-1">
            {totalStockUnits} <span className="text-xs font-normal text-slate-500">Units</span>
          </p>
          <span className="text-[10px] text-slate-400">Physical stock across all SKUs</span>
        </div>

        {/* Cost valuation hidden for cashier */}
        {!isCashier && (
          <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs">
            <span className="text-xs font-medium text-slate-500 block">Stock Valuation (Cost)</span>
            <p className="text-xl font-bold text-slate-900 font-mono tabular-nums mt-1">
              {formatBDT(totalStockValuation)}
            </p>
            <span className="text-[10px] text-slate-400">Total purchase asset valuation</span>
          </div>
        )}

        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs">
          <span className="text-xs font-medium text-slate-500 block">Retail Value Potential</span>
          <p className="text-xl font-bold text-amber-700 font-mono tabular-nums mt-1">
            {formatBDT(totalRetailValuation)}
          </p>
          <span className="text-[10px] text-slate-400">Based on catalog selling prices</span>
        </div>
      </div>

      {/* ================= TAB 1: CURRENT STOCK SUMMARY ================= */}
      {activeTab === 'SUMMARY' && (
        <div className="space-y-4">
          <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-xs flex items-center justify-between">
            <div className="relative w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search inventory product..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded"
              />
            </div>
            <span className="text-xs text-slate-500">
              Showing {filteredProducts.length} items
            </span>
          </div>

          <div className="bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4">Item & SKU</th>
                  <th className="py-3 px-3">Brand & Category</th>
                  <th className="py-3 px-3 text-center">Current Stock</th>
                  <th className="py-3 px-3 text-center">Alert Level</th>
                  {!isCashier && <th className="py-3 px-3 text-right">Cost Price</th>}
                  <th className="py-3 px-3 text-right">Selling Price</th>
                  <th className="py-3 px-3 text-center">Stock Condition</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={isCashier ? 6 : 7} className="py-12 text-center text-slate-400">
                      <Loader2 className="w-5 h-5 animate-spin mx-auto text-amber-500 mb-2" />
                      Loading stock levels in real time...
                    </td>
                  </tr>
                ) : filteredProducts.length === 0 ? (
                  <tr>
                    <td colSpan={isCashier ? 6 : 7} className="py-12 text-center text-slate-400">
                      No matching products in warehouse inventory.
                    </td>
                  </tr>
                ) : (
                  filteredProducts.map((p) => {
                    const isLow = p.currentStock <= p.minStockLevel;
                    return (
                      <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3 px-4 font-semibold text-slate-900">
                          <div>{p.name}</div>
                          <div className="text-[10px] font-mono text-slate-400">{p.sku}</div>
                        </td>
                        <td className="py-3 px-3 text-slate-600">
                          <div>{p.brand}</div>
                          <div className="text-[10px] text-slate-400">{p.category}</div>
                        </td>
                        <td className="py-3 px-3 text-center font-mono font-bold text-slate-900">
                          {p.currentStock} {p.unit}
                        </td>
                        <td className="py-3 px-3 text-center font-mono text-slate-500">
                          {p.minStockLevel} {p.unit}
                        </td>
                        {!isCashier && (
                          <td className="py-3 px-3 text-right font-mono text-slate-600">
                            {formatBDT(p.purchasePrice)}
                          </td>
                        )}
                        <td className="py-3 px-3 text-right font-mono font-bold text-slate-900">
                          {formatBDT(p.sellingPrice)}
                        </td>
                        <td className="py-3 px-3 text-center">
                          {isLow ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800">
                              <AlertTriangle className="w-3 h-3" /> Low Stock
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-100 text-emerald-800">
                              Adequate
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ================= TAB 2: AUDIT MOVEMENT LEDGER ================= */}
      {activeTab === 'LEDGER' && (
        <div className="space-y-4">
          <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-slate-400" />
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as any)}
                className="text-xs p-1.5 bg-slate-50 border border-slate-300 rounded font-medium"
              >
                <option value="ALL">All Movement Types</option>
                <option value="SALE">Sales (Outflow)</option>
                <option value="PURCHASE">Purchases (Inflow)</option>
                <option value="SALES_RETURN">Sales Returns (Inflow)</option>
                <option value="PURCHASE_RETURN">Purchase Returns (Outflow)</option>
                <option value="OPENING">Opening Balances</option>
              </select>
            </div>
            <span className="text-xs text-slate-500 font-mono">
              {movements.length} logged entries
            </span>
          </div>

          <div className="bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4">Date / Time</th>
                  <th className="py-3 px-3">Product Name</th>
                  <th className="py-3 px-3 text-center">Movement Type</th>
                  <th className="py-3 px-3 text-right">In (+)</th>
                  <th className="py-3 px-3 text-right">Out (-)</th>
                  <th className="py-3 px-3 text-right">Balance</th>
                  <th className="py-3 px-4">Reference Document</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {movements.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400 font-sans">
                      No stock movement audit records found.
                    </td>
                  </tr>
                ) : (
                  movements.map((m) => (
                    <tr key={m.id} className="hover:bg-slate-50">
                      <td className="py-3 px-4 text-slate-500 font-sans text-[11px]">
                        {formatDateTime(m.date)}
                      </td>
                      <td className="py-3 px-3 font-sans font-semibold text-slate-900">
                        {m.productName}
                      </td>
                      <td className="py-3 px-3 text-center font-sans">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            m.type === 'PURCHASE' || m.type === 'SALES_RETURN' || m.type === 'OPENING'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {m.type}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right text-emerald-600 font-bold">
                        {m.quantityIn > 0 ? `+${m.quantityIn}` : '-'}
                      </td>
                      <td className="py-3 px-3 text-right text-rose-600 font-bold">
                        {m.quantityOut > 0 ? `-${m.quantityOut}` : '-'}
                      </td>
                      <td className="py-3 px-3 text-right text-slate-900 font-bold">
                        {m.balance}
                      </td>
                      <td className="py-3 px-4 text-slate-600 font-sans text-xs">
                        <div className="font-medium text-slate-800">{m.reference}</div>
                        {m.notes && <div className="text-[10px] text-slate-400">{m.notes}</div>}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
