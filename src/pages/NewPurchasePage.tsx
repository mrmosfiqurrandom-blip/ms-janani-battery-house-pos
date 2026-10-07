import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { purchaseService } from '../services/purchaseService';
import { supplierService } from '../services/supplierService';
import { productService } from '../services/productService';
import { accountService } from '../services/accountService';
import { Supplier, Product, Account, PurchaseItem, PaymentMethod } from '../types';
import { formatBDT } from '../utils/formatters';
import { useToast } from '../context/ToastContext';
import { Plus, Trash2, Save, ShoppingBag, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

export const NewPurchasePage: React.FC = () => {
  const navigate = useNavigate();
  const { success, error } = useToast();

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);

  // Form
  const [supplierId, setSupplierId] = useState('');
  const [purchaseNo, setPurchaseNo] = useState(`VP-PUR-${Math.floor(800 + Math.random() * 200)}`);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [items, setItems] = useState<PurchaseItem[]>([]);
  const [paidAmount, setPaidAmount] = useState<number>(0);
  const [accountId, setAccountId] = useState('acc-2');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('BANK');
  const [notes, setNotes] = useState('');

  // Item selector
  const [selectedProductId, setSelectedProductId] = useState('');
  const [itemQty, setItemQty] = useState(1);
  const [itemCost, setItemCost] = useState(0);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [sups, prods, accs] = await Promise.all([
        supplierService.getSuppliers(),
        productService.getProducts(),
        accountService.getAccounts(),
      ]);
      setSuppliers(sups);
      setProducts(prods);
      setAccounts(accs);
      if (sups.length > 0) setSupplierId(sups[0].id);
      if (prods.length > 0) {
        setSelectedProductId(prods[0].id);
        setItemCost(prods[0].purchasePrice);
      }
    } catch {
      error('Failed to initialize purchase form');
    }
  };

  const handleProductChange = (prodId: string) => {
    setSelectedProductId(prodId);
    const prod = products.find((p) => p.id === prodId);
    if (prod) {
      setItemCost(prod.purchasePrice);
    }
  };

  const handleAddItem = () => {
    const prod = products.find((p) => p.id === selectedProductId);
    if (!prod || itemQty <= 0 || itemCost <= 0) return;

    const newItem: PurchaseItem = {
      productId: prod.id,
      productName: prod.name,
      unit: prod.unit,
      quantity: itemQty,
      purchaseCost: itemCost,
      total: itemQty * itemCost,
    };

    setItems([...items, newItem]);
    setItemQty(1);
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, idx) => idx !== index));
  };

  const total = items.reduce((acc, it) => acc + it.total, 0);
  const dueAmount = Math.max(0, total - paidAmount);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) {
      error('Please add at least one product item');
      return;
    }
    const sup = suppliers.find((s) => s.id === supplierId);
    if (!sup) return;

    try {
      await purchaseService.createPurchase({
        purchaseNo,
        supplierId: sup.id,
        supplierName: sup.name,
        date: new Date(date).toISOString(),
        items,
        subtotal: total,
        tax: 0,
        total,
        paidAmount,
        dueAmount,
        paymentMethod,
        accountId,
        status: dueAmount === 0 ? 'RECEIVED' : 'PARTIAL',
        notes,
      });

      success('Purchase Recorded', `Order #${purchaseNo} saved and inventory adjusted in Firestore.`);
      navigate('/purchases');
    } catch (err: any) {
      error('Failed to create purchase entry', err?.message || 'Database error occurred');
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link to="/purchases" className="p-1 text-slate-500 hover:text-slate-800 rounded">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Create Supplier Purchase
            </h1>
            <p className="text-xs text-slate-500">Record incoming stock consignment from factory</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5 text-xs">
        {/* Top Supplier & Invoice Card */}
        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-xs space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-slate-700 font-medium mb-1">Supplier</label>
              <select
                value={supplierId}
                onChange={(e) => setSupplierId(e.target.value)}
                className="w-full p-2 border border-slate-300 rounded font-medium text-slate-800"
              >
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-slate-700 font-medium mb-1">Purchase Invoice #</label>
              <input
                type="text"
                required
                value={purchaseNo}
                onChange={(e) => setPurchaseNo(e.target.value)}
                className="w-full p-2 border border-slate-300 rounded font-mono font-medium"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-medium mb-1">Purchase Date</label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full p-2 border border-slate-300 rounded"
              />
            </div>
          </div>
        </div>

        {/* Add Products Card */}
        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-xs space-y-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700">
            Consignment Products
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end bg-slate-50 p-3 rounded border border-slate-100">
            <div className="sm:col-span-6">
              <label className="block text-slate-700 font-medium mb-1">Select Product</label>
              <select
                value={selectedProductId}
                onChange={(e) => handleProductChange(e.target.value)}
                className="w-full p-2 border border-slate-300 rounded text-xs"
              >
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.sku})
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-slate-700 font-medium mb-1">Quantity</label>
              <input
                type="number"
                min="1"
                value={itemQty}
                onChange={(e) => setItemQty(Math.max(1, Number(e.target.value)))}
                className="w-full p-2 border border-slate-300 rounded font-mono"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-slate-700 font-medium mb-1">Unit Cost (৳)</label>
              <input
                type="number"
                min="0"
                value={itemCost}
                onChange={(e) => setItemCost(Number(e.target.value) || 0)}
                className="w-full p-2 border border-slate-300 rounded font-mono font-semibold"
              />
            </div>

            <div className="sm:col-span-2">
              <button
                type="button"
                onClick={handleAddItem}
                className="w-full py-2 px-3 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded transition-colors inline-flex items-center justify-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Item</span>
              </button>
            </div>
          </div>

          {/* Table of added items */}
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-2.5 px-3">Product Name</th>
                  <th className="py-2.5 px-3 text-right">Unit Cost</th>
                  <th className="py-2.5 px-3 text-center">Qty</th>
                  <th className="py-2.5 px-3 text-right">Subtotal</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-slate-400">
                      No items added yet. Select a product above.
                    </td>
                  </tr>
                ) : (
                  items.map((item, idx) => (
                    <tr key={idx}>
                      <td className="py-2.5 px-3 font-semibold text-slate-900">
                        {item.productName}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono tabular-nums">
                        {formatBDT(item.purchaseCost)}
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono">
                        {item.quantity} {item.unit}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono tabular-nums font-bold text-slate-900">
                        {formatBDT(item.total)}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(idx)}
                          className="p-1 text-slate-400 hover:text-rose-600"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Financial Summary & Payment */}
        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-xs space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-700 font-medium mb-1">Payment Method</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                className="w-full p-2 border border-slate-300 rounded mb-2"
              >
                <option value="BANK">Bank RTGS / BEFTN</option>
                <option value="CASH">Cash Register</option>
                <option value="BKASH">bKash Merchant</option>
                <option value="NAGAD">Nagad</option>
              </select>

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

            <div className="space-y-2 p-3 bg-slate-50 rounded border border-slate-100 text-right">
              <div className="flex justify-between font-bold text-sm text-slate-900">
                <span>Total Consignment Value:</span>
                <span className="font-mono tabular-nums">{formatBDT(total)}</span>
              </div>

              <div className="flex items-center justify-between text-emerald-700 font-semibold">
                <span>Immediate Paid Amount:</span>
                <input
                  type="number"
                  min="0"
                  max={total}
                  value={paidAmount}
                  onChange={(e) => setPaidAmount(Number(e.target.value) || 0)}
                  className="w-32 text-right p-1 bg-white border border-slate-300 rounded font-mono font-bold"
                />
              </div>

              <div className="flex justify-between font-bold text-amber-600 pt-2 border-t border-slate-200">
                <span>Supplier Due (Payable):</span>
                <span className="font-mono tabular-nums">{formatBDT(dueAmount)}</span>
              </div>
            </div>
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <Link
              to="/purchases"
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded"
            >
              Cancel
            </Link>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded transition-colors inline-flex items-center gap-1.5 shadow-xs"
            >
              <Save className="w-4 h-4" />
              <span>Save Consignment</span>
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
