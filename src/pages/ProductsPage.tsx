import React, { useState, useEffect } from 'react';
import { productService } from '../services/productService';
import { Product, ProductType, Brand, Category, Unit } from '../types';
import { formatBDT } from '../utils/formatters';
import { StatusBadge } from '../components/StatusBadge';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import {
  Search,
  Plus,
  Package,
  Edit,
  Trash2,
  AlertTriangle,
  Barcode,
  Filter,
  CheckCircle2,
  X,
  Loader2,
  EyeOff,
} from 'lucide-react';

export const ProductsPage: React.FC = () => {
  const { success, error, warning } = useToast();
  const { role } = useAuth();
  const isCashier = role === 'CASHIER';

  const [products, setProducts] = useState<Product[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);

  // Search & Filter
  const [search, setSearch] = useState('');
  const [brandFilter, setBrandFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');

  // Add / Edit Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState<Omit<Product, 'id'>>({
    name: '',
    sku: '',
    barcode: '',
    brand: 'Hamko',
    category: 'Battery',
    subcategory: 'IPS Battery',
    unit: 'Piece',
    purchasePrice: 0,
    sellingPrice: 0,
    minSellingPrice: 0,
    currentStock: 0,
    minStockLevel: 5,
    productType: 'Battery',
    status: 'ACTIVE',
    description: '',
  });

  useEffect(() => {
    // Real-time listener for products from Firestore
    setLoading(true);
    const unsubProducts = productService.subscribeProducts(
      (prods) => {
        setProducts(prods);
        setLoading(false);
      },
      (err) => {
        console.error('Failed to subscribe products:', err);
        setLoading(false);
      }
    );

    const unsubCategories = productService.subscribeCategories((cats) => setCategories(cats));
    const unsubBrands = productService.subscribeBrands((brs) => setBrands(brs));
    const unsubUnits = productService.subscribeUnits((uns) => setUnits(uns));

    return () => {
      unsubProducts();
      unsubCategories();
      unsubBrands();
      unsubUnits();
    };
  }, []);

  const handleOpenAdd = () => {
    if (isCashier) {
      warning('Access Restricted', 'Cashiers cannot create catalog products. Please contact manager.');
      return;
    }
    setEditingId(null);
    setForm({
      name: '',
      sku: `PRD-${Date.now().toString().slice(-4)}`,
      barcode: `894${Math.floor(100000000 + Math.random() * 900000000)}`,
      brand: brands[0]?.name || 'Hamko',
      category: categories[0]?.name || 'Battery',
      subcategory: categories[0]?.subcategories[0] || 'IPS Battery',
      unit: units[0]?.name || 'Piece',
      purchasePrice: 1000,
      sellingPrice: 1300,
      minSellingPrice: 1200,
      currentStock: 10,
      minStockLevel: 3,
      productType: 'Battery',
      status: 'ACTIVE',
      description: '',
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (p: Product) => {
    if (isCashier) {
      warning('Access Restricted', 'Cashiers cannot modify product details.');
      return;
    }
    setEditingId(p.id);
    setForm({
      name: p.name,
      sku: p.sku,
      barcode: p.barcode,
      brand: p.brand,
      category: p.category,
      subcategory: p.subcategory || '',
      unit: p.unit,
      purchasePrice: p.purchasePrice,
      sellingPrice: p.sellingPrice,
      minSellingPrice: p.minSellingPrice,
      currentStock: p.currentStock,
      minStockLevel: p.minStockLevel,
      productType: p.productType,
      status: p.status,
      description: p.description || '',
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string, name: string) => {
    if (role !== 'ADMIN') {
      warning('Access Restricted', 'Only administrators can delete products from the catalog.');
      return;
    }
    if (!window.confirm(`Delete product "${name}" permanently?`)) return;
    try {
      await productService.deleteProduct(id);
      success('Product Deleted', `Removed ${name} from catalog.`);
    } catch (err: any) {
      error('Delete Failed', err.message || 'Could not delete product');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (editingId) {
        await productService.updateProduct(editingId, form);
        success('Product Updated', `${form.name} updated successfully.`);
      } else {
        await productService.createProduct(form);
        success('Product Created', `${form.name} added to catalog.`);
      }
      setIsModalOpen(false);
    } catch (err: any) {
      error('Failed to save product', err?.message || 'Database error occurred');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredProducts = products.filter((p) => {
    const matchSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.sku.toLowerCase().includes(search.toLowerCase()) ||
      p.barcode.toLowerCase().includes(search.toLowerCase());
    const matchBrand = brandFilter === 'ALL' || p.brand === brandFilter;
    const matchCategory = categoryFilter === 'ALL' || p.category === categoryFilter;
    return matchSearch && matchBrand && matchCategory;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Products Catalog</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time Firestore products, current stock balance, and retail pricing
            {isCashier && (
              <span className="ml-2 inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-100 px-2 py-0.5 rounded">
                <EyeOff className="w-3 h-3" /> Purchase cost hidden for Cashier
              </span>
            )}
          </p>
        </div>

        {!isCashier && (
          <button
            onClick={handleOpenAdd}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-md transition-colors shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Product</span>
          </button>
        )}
      </div>

      {/* Search & Filters */}
      <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search by name, SKU, or barcode..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded focus:outline-hidden focus:ring-1 focus:ring-amber-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="text-xs p-2 bg-slate-50 border border-slate-300 rounded font-medium text-slate-700"
          >
            <option value="ALL">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.name}>
                {c.name}
              </option>
            ))}
          </select>

          <select
            value={brandFilter}
            onChange={(e) => setBrandFilter(e.target.value)}
            className="text-xs p-2 bg-slate-50 border border-slate-300 rounded font-medium text-slate-700"
          >
            <option value="ALL">All Brands</option>
            {brands.map((b) => (
              <option key={b.id} value={b.name}>
                {b.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-4">Product Name</th>
                <th className="py-3 px-3">SKU / Barcode</th>
                <th className="py-3 px-3">Brand & Category</th>
                {!isCashier && <th className="py-3 px-3 text-right">Purchase Cost</th>}
                <th className="py-3 px-3 text-right">Retail Price</th>
                <th className="py-3 px-3 text-center">Current Stock</th>
                <th className="py-3 px-3 text-center">Status</th>
                {!isCashier && <th className="py-3 px-4 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={isCashier ? 6 : 8} className="py-12 text-center text-slate-400">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-amber-500 mb-2" />
                    <span>Loading products from Firestore in real-time...</span>
                  </td>
                </tr>
              ) : filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={isCashier ? 6 : 8} className="py-12 text-center text-slate-400">
                    No products found in Firestore matching query.
                  </td>
                </tr>
              ) : (
                filteredProducts.map((p) => {
                  const isLow = p.currentStock <= p.minStockLevel;
                  return (
                    <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-4">
                        <span className="font-semibold text-slate-900 block">{p.name}</span>
                        {p.description && (
                          <span className="text-[10px] text-slate-500 block truncate max-w-xs">
                            {p.description}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 font-mono text-[11px] text-slate-600">
                        <div>{p.sku}</div>
                        <div className="text-[10px] text-slate-400">{p.barcode}</div>
                      </td>
                      <td className="py-3 px-3 text-slate-600">
                        <div className="font-medium text-slate-800">{p.brand}</div>
                        <div className="text-[10px] text-slate-400">{p.category}</div>
                      </td>
                      {/* Cashier cannot see purchase cost */}
                      {!isCashier && (
                        <td className="py-3 px-3 text-right font-mono tabular-nums text-slate-600">
                          {formatBDT(p.purchasePrice)}
                        </td>
                      )}
                      <td className="py-3 px-3 text-right font-mono tabular-nums font-bold text-slate-900">
                        {formatBDT(p.sellingPrice)}
                      </td>
                      <td className="py-3 px-3 text-center font-mono">
                        <span
                          className={`inline-flex items-center gap-1 font-bold ${
                            isLow ? 'text-rose-600' : 'text-slate-900'
                          }`}
                        >
                          {p.currentStock} {p.unit}
                          {isLow && <AlertTriangle className="w-3 h-3 text-rose-500 inline" />}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <StatusBadge status={p.status} />
                      </td>
                      {!isCashier && (
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleOpenEdit(p)}
                              className="p-1 text-slate-400 hover:text-amber-700 hover:bg-slate-100 rounded"
                              title="Edit product"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                            {role === 'ADMIN' && (
                              <button
                                onClick={() => handleDelete(p.id, p.name)}
                                className="p-1 text-slate-400 hover:text-rose-700 hover:bg-rose-50 rounded"
                                title="Delete product"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal for Add / Edit Product */}
      {isModalOpen && !isCashier && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-2xs">
          <div className="bg-white rounded-lg shadow-xl border border-slate-200 w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-100 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200 bg-slate-50">
              <h2 className="text-sm font-bold text-slate-900">
                {editingId ? 'Edit Product Catalog Item' : 'Add New Inventory Product'}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto flex-1 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-slate-700 font-semibold mb-1">Product Title</label>
                  <input
                    type="text"
                    required
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="e.g. Hamko 12V 100Ah Deep Cycle IPS Battery"
                    className="w-full p-2 border border-slate-300 rounded focus:ring-1 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">SKU</label>
                  <input
                    type="text"
                    required
                    value={form.sku}
                    onChange={(e) => setForm({ ...form, sku: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Barcode</label>
                  <input
                    type="text"
                    value={form.barcode}
                    onChange={(e) => setForm({ ...form, barcode: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Brand</label>
                  <select
                    value={form.brand}
                    onChange={(e) => setForm({ ...form, brand: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded bg-white"
                  >
                    {brands.map((b) => (
                      <option key={b.id} value={b.name}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Category</label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded bg-white"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.name}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Purchase Cost (৳)</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={form.purchasePrice}
                    onChange={(e) => setForm({ ...form, purchasePrice: Number(e.target.value) || 0 })}
                    className="w-full p-2 border border-slate-300 rounded font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Retail Selling Price (৳)</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={form.sellingPrice}
                    onChange={(e) => setForm({ ...form, sellingPrice: Number(e.target.value) || 0 })}
                    className="w-full p-2 border border-slate-300 rounded font-mono font-bold text-amber-700"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Current Stock Quantity</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={form.currentStock}
                    onChange={(e) => setForm({ ...form, currentStock: Number(e.target.value) || 0 })}
                    className="w-full p-2 border border-slate-300 rounded font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Low Stock Warning Alert Level</label>
                  <input
                    type="number"
                    min="1"
                    value={form.minStockLevel}
                    onChange={(e) => setForm({ ...form, minStockLevel: Number(e.target.value) || 3 })}
                    className="w-full p-2 border border-slate-300 rounded font-mono"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3.5 py-2 border border-slate-300 rounded text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-600 font-bold text-slate-950 rounded flex items-center gap-1.5 shadow-xs disabled:opacity-60"
                >
                  {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{editingId ? 'Update Product' : 'Save to Firestore'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
