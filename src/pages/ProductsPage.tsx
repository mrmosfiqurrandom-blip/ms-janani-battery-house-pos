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
  Layers,
  Tag,
  Boxes,
  Scale,
  TrendingUp,
  BarChart3,
  Check,
  RefreshCw,
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

  // Active Main View Tab
  const [activeTab, setActiveTab] = useState<'LIST' | 'ADD_PRODUCT' | 'META' | 'SUMMARY'>('LIST');

  // Search & Filter
  const [search, setSearch] = useState('');
  const [brandFilter, setBrandFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [stockStatusFilter, setStockStatusFilter] = useState<'ALL' | 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK'>('ALL');

  // Add / Edit Modal / Form State
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
    purchasePrice: 1000,
    sellingPrice: 1300,
    minSellingPrice: 1200,
    currentStock: 10,
    openingStock: 10,
    ownStock: 10,
    minStockLevel: 3,
    productType: 'Battery',
    status: 'ACTIVE',
    description: '',
  });

  // Inline Quick Add Meta (Brand, Category, Unit)
  const [showAddBrandModal, setShowAddBrandModal] = useState(false);
  const [newBrandName, setNewBrandName] = useState('');
  const [showAddCatModal, setShowAddCatModal] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [showAddUnitModal, setShowAddUnitModal] = useState(false);
  const [newUnitName, setNewUnitName] = useState('');

  useEffect(() => {
    setLoading(true);
    const unsubProducts = productService.subscribeProducts(
      (prods) => {
        setProducts(prods);
        setLoading(false);
      },
      () => setLoading(false)
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

  const resetForm = () => {
    setEditingId(null);
    setForm({
      name: '',
      sku: `PRD-${Date.now().toString().slice(-4)}`,
      barcode: `894${Math.floor(100000000 + Math.random() * 900000000)}`,
      brand: brands[0]?.name || 'Hamko',
      category: categories[0]?.name || 'Battery',
      subcategory: categories[0]?.subcategories?.[0] || 'IPS Battery',
      unit: units[0]?.name || 'Piece',
      purchasePrice: 1000,
      sellingPrice: 1300,
      minSellingPrice: 1200,
      currentStock: 10,
      openingStock: 10,
      ownStock: 10,
      minStockLevel: 3,
      productType: 'Battery',
      status: 'ACTIVE',
      description: '',
    });
  };

  const handleOpenAdd = () => {
    if (isCashier) {
      warning('অ্যাক্সেস সীমাবদ্ধ', 'ক্যাশিয়ার নতুন প্রোডাক্ট যোগ করতে পারেন না।');
      return;
    }
    resetForm();
    setActiveTab('ADD_PRODUCT');
  };

  const handleOpenEdit = (p: Product) => {
    if (isCashier) {
      warning('অ্যাক্সেস সীমাবদ্ধ', 'ক্যাশিয়ার প্রোডাক্ট এডিট করতে পারেন না।');
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
      openingStock: p.openingStock ?? p.currentStock,
      ownStock: p.ownStock ?? p.currentStock,
      minStockLevel: p.minStockLevel,
      productType: p.productType,
      status: p.status,
      description: p.description || '',
    });
    setActiveTab('ADD_PRODUCT');
  };

  const handleDelete = async (id: string, name: string) => {
    if (role !== 'ADMIN') {
      warning('অ্যাক্সেস সীমাবদ্ধ', 'শুধুমাত্র অ্যাডমিন প্রোডাক্ট মুছে ফেলতে পারেন।');
      return;
    }
    if (!window.confirm(`আপনি কি "${name}" প্রোডাক্টটি মুছে ফেলতে নিশ্চিত?`)) return;
    try {
      await productService.deleteProduct(id);
      success('প্রোডাক্ট ডিলিট হয়েছে', `${name} ক্যাটালগ থেকে মুছে ফেলা হয়েছে।`);
    } catch (err: any) {
      error('ডিলিট ব্যর্থ', err.message || 'প্রোডাক্ট ডিলিট করা যায়নি');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      error('নাম প্রয়োজন', 'অনুগ্রহ করে প্রোডাক্টের নাম লিখুন।');
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        ...form,
        currentStock: Number(form.currentStock) || 0,
        openingStock: Number(form.openingStock) || 0,
        ownStock: Number(form.ownStock) || 0,
        purchasePrice: Number(form.purchasePrice) || 0,
        sellingPrice: Number(form.sellingPrice) || 0,
        minSellingPrice: Number(form.minSellingPrice) || 0,
        minStockLevel: Number(form.minStockLevel) || 0,
      };

      if (editingId) {
        await productService.updateProduct(editingId, payload);
        success('প্রোডাক্ট আপডেট সম্পন্ন', `${form.name} সফলভাবে আপডেট হয়েছে।`);
      } else {
        await productService.createProduct(payload);
        success('নতুন প্রোডাক্ট যুক্ত হয়েছে', `${form.name} সফলভাবে ডাটাবেজে সংরক্ষণ করা হয়েছে।`);
      }
      resetForm();
      setActiveTab('LIST');
    } catch (err: any) {
      error('সংরক্ষণ ব্যর্থ হয়েছে', err?.message || 'ডাটাবেজে প্রোডাক্ট সংরক্ষণ করা যায়নি');
    } finally {
      setSubmitting(false);
    }
  };

  // Quick Add Brand
  const handleCreateBrand = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBrandName.trim()) return;
    try {
      await productService.createBrand({
        name: newBrandName.trim(),
        code: newBrandName.slice(0, 3).toUpperCase(),
        description: 'Store Brand',
        status: 'ACTIVE',
      });
      setForm((prev) => ({ ...prev, brand: newBrandName.trim() }));
      setNewBrandName('');
      setShowAddBrandModal(false);
      success('ব্র্যান্ড যুক্ত হয়েছে', `${newBrandName} সফলভাবে যোগ করা হয়েছে।`);
    } catch {
      error('ব্র্যান্ড যোগ করা ব্যর্থ');
    }
  };

  // Quick Add Category
  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    try {
      await productService.createCategory({
        name: newCatName.trim(),
        subcategories: ['General'],
        status: 'ACTIVE',
      });
      setForm((prev) => ({ ...prev, category: newCatName.trim(), subcategory: 'General' }));
      setNewCatName('');
      setShowAddCatModal(false);
      success('ক্যাটাগরি যুক্ত হয়েছে', `${newCatName} সফলভাবে যোগ করা হয়েছে।`);
    } catch {
      error('ক্যাটাগরি যোগ করা ব্যর্থ');
    }
  };

  // Quick Add Unit
  const handleCreateUnit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUnitName.trim()) return;
    try {
      await productService.createUnit({
        name: newUnitName.trim(),
        shortName: newUnitName.slice(0, 3).toLowerCase(),
        allowDecimal: false,
      });
      setForm((prev) => ({ ...prev, unit: newUnitName.trim() }));
      setNewUnitName('');
      setShowAddUnitModal(false);
      success('ইউনিট টাইপ যুক্ত হয়েছে', `${newUnitName} সফলভাবে যোগ করা হয়েছে।`);
    } catch {
      error('ইউনিট যোগ করা ব্যর্থ');
    }
  };

  // Filtered Products
  const filteredProducts = products.filter((p) => {
    const matchSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.sku.toLowerCase().includes(search.toLowerCase()) ||
      p.barcode.toLowerCase().includes(search.toLowerCase());
    const matchBrand = brandFilter === 'ALL' || p.brand === brandFilter;
    const matchCategory = categoryFilter === 'ALL' || p.category === categoryFilter;

    let matchStockStatus = true;
    if (stockStatusFilter === 'OUT_OF_STOCK') {
      matchStockStatus = p.currentStock <= 0;
    } else if (stockStatusFilter === 'LOW_STOCK') {
      matchStockStatus = p.currentStock > 0 && p.currentStock <= p.minStockLevel;
    } else if (stockStatusFilter === 'IN_STOCK') {
      matchStockStatus = p.currentStock > p.minStockLevel;
    }

    return matchSearch && matchBrand && matchCategory && matchStockStatus;
  });

  // KPI Stock Summary Calculations
  const totalProductsCount = products.length;
  const totalOpeningStockCount = products.reduce((sum, p) => sum + (p.openingStock ?? p.currentStock ?? 0), 0);
  const totalCurrentStockCount = products.reduce((sum, p) => sum + (p.currentStock || 0), 0);
  const totalOwnStockCount = products.reduce((sum, p) => sum + (p.ownStock ?? p.currentStock ?? 0), 0);
  const totalStockValuationCost = products.reduce((sum, p) => sum + (p.currentStock || 0) * (p.purchasePrice || 0), 0);
  const totalStockValuationRetail = products.reduce((sum, p) => sum + (p.currentStock || 0) * (p.sellingPrice || 0), 0);
  const lowStockCount = products.filter((p) => p.currentStock > 0 && p.currentStock <= p.minStockLevel).length;
  const outOfStockCount = products.filter((p) => p.currentStock <= 0).length;

  return (
    <div className="space-y-5">
      {/* Page Title & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-amber-500/10 text-amber-700 rounded-lg">
              <Boxes className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                প্রোডাক্ট ও স্টক ম্যানেজমেন্ট (Products & Inventory)
              </h1>
              <p className="text-xs text-slate-500">
                নতুন প্রোডাক্ট এন্ট্রি, ব্র্যান্ড, ক্যাটাগরি, ইউনিট টাইপ, ওপেনিং স্টক ও সামগ্রিক স্টক সামারি
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!isCashier && (
            <button
              onClick={handleOpenAdd}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors shadow-xs cursor-pointer ${
                activeTab === 'ADD_PRODUCT' && !editingId
                  ? 'bg-amber-500 text-slate-950 font-bold ring-2 ring-amber-400'
                  : 'bg-amber-400 hover:bg-amber-300 text-slate-950'
              }`}
            >
              <Plus className="w-4 h-4" />
              <span>+ অ্যাড নিউ প্রোডাক্ট (Add New Product)</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Tabs Navigation */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab('LIST')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
            activeTab === 'LIST'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Package className="w-4 h-4" />
          <span>সকল প্রোডাক্ট ও স্টক লিস্ট ({filteredProducts.length})</span>
        </button>

        {!isCashier && (
          <button
            onClick={handleOpenAdd}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'ADD_PRODUCT'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <Plus className="w-4 h-4 text-amber-500" />
            <span>{editingId ? 'প্রোডাক্ট এডিট করুন' : 'অ্যাড নিউ প্রোডাক্ট (Add Product)'}</span>
          </button>
        )}

        <button
          onClick={() => setActiveTab('META')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
            activeTab === 'META'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Tag className="w-4 h-4 text-blue-500" />
          <span>ব্র্যান্ড, ক্যাটাগরি ও ইউনিট টাইপ</span>
        </button>

        <button
          onClick={() => setActiveTab('SUMMARY')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
            activeTab === 'SUMMARY'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <BarChart3 className="w-4 h-4 text-emerald-500" />
          <span>স্টক সামারি ও মূল্যায়ন</span>
        </button>
      </div>

      {/* Stock Summary KPI Cards (Visible on List and Summary tabs) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
            মোট প্রোডাক্ট (SKU)
          </span>
          <div className="text-xl font-black text-slate-900 font-mono tabular-nums">
            {totalProductsCount} টি
          </div>
          <span className="text-[10px] text-slate-500">ডাটাবেজে নিবন্ধিত</span>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
            ওপেনিং স্টক (Opening)
          </span>
          <div className="text-xl font-black text-blue-700 font-mono tabular-nums">
            {totalOpeningStockCount}
          </div>
          <span className="text-[10px] text-blue-600">প্রারম্ভিক ব্যালেন্স</span>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
            ওন / বর্তমান স্টক
          </span>
          <div className="text-xl font-black text-emerald-700 font-mono tabular-nums">
            {totalCurrentStockCount}
          </div>
          <span className="text-[10px] text-emerald-600">নিজস্ব মজুদ পরিমাণ</span>
        </div>

        {!isCashier && (
          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              স্টক মূল্য (ক্রয়মূল্য)
            </span>
            <div className="text-lg font-black text-slate-900 font-mono tabular-nums">
              {formatBDT(totalStockValuationCost)}
            </div>
            <span className="text-[10px] text-slate-500">Purchase Cost Asset</span>
          </div>
        )}

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
            স্টক মূল্য (বিক্রয়)
          </span>
          <div className="text-lg font-black text-amber-700 font-mono tabular-nums">
            {formatBDT(totalStockValuationRetail)}
          </div>
          <span className="text-[10px] text-amber-600">Expected Sales Revenue</span>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
            স্টক অ্যালার্ট
          </span>
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-amber-700 font-mono">{lowStockCount} স্বল্প</span>
            <span className="text-slate-300">|</span>
            <span className="text-sm font-bold text-rose-700 font-mono">{outOfStockCount} শূন্য</span>
          </div>
          <span className="text-[10px] text-slate-500">পুনরায় ক্রয় প্রয়োজন</span>
        </div>
      </div>

      {/* ================= TAB 1: PRODUCT LIST VIEW ================= */}
      {activeTab === 'LIST' && (
        <div className="space-y-4">
          {/* Search & Filters */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between">
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="প্রোডাক্ট নাম, SKU অথবা বারকোড খুঁজুন..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-amber-500 focus:bg-white"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
              {/* Brand Filter */}
              <select
                value={brandFilter}
                onChange={(e) => setBrandFilter(e.target.value)}
                className="text-xs p-2 bg-slate-50 border border-slate-300 rounded-lg font-medium text-slate-700"
              >
                <option value="ALL">সকল ব্র্যান্ড (All Brands)</option>
                {brands.map((b) => (
                  <option key={b.id} value={b.name}>
                    {b.name}
                  </option>
                ))}
              </select>

              {/* Category Filter */}
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="text-xs p-2 bg-slate-50 border border-slate-300 rounded-lg font-medium text-slate-700"
              >
                <option value="ALL">সকল ক্যাটাগরি (All Categories)</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>

              {/* Stock Status Filter */}
              <select
                value={stockStatusFilter}
                onChange={(e) => setStockStatusFilter(e.target.value as any)}
                className="text-xs p-2 bg-slate-50 border border-slate-300 rounded-lg font-medium text-slate-700"
              >
                <option value="ALL">সকল স্টক স্ট্যাটাস</option>
                <option value="IN_STOCK">পর্যাপ্ত স্টক</option>
                <option value="LOW_STOCK">স্বল্প স্টক (Low)</option>
                <option value="OUT_OF_STOCK">স্টক শেষ (Out)</option>
              </select>
            </div>
          </div>

          {/* Products Table (Desktop) & Cards (Mobile) */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            {/* Desktop Table View */}
            <div className="overflow-x-auto hidden sm:block">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="py-3 px-4">প্রোডাক্ট তথ্য</th>
                    <th className="py-3 px-3">ব্র্যান্ড ও ক্যাটাগরি</th>
                    <th className="py-3 px-3 text-center">ইউনিট</th>
                    {!isCashier && <th className="py-3 px-3 text-right">ক্রয়মূল্য</th>}
                    <th className="py-3 px-3 text-right">বিক্রয়মূল্য</th>
                    <th className="py-3 px-3 text-center text-blue-700">ওপেনিং স্টক</th>
                    <th className="py-3 px-3 text-center text-emerald-700 font-bold">ওন / বর্তমান স্টক</th>
                    <th className="py-3 px-3 text-center">স্ট্যাটাস</th>
                    <th className="py-3 px-4 text-right">অ্যাকশন</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-slate-400">
                        <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-amber-500" />
                        প্রোডাক্ট লোড হচ্ছে...
                      </td>
                    </tr>
                  ) : filteredProducts.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-slate-400">
                        কোন প্রোডাক্ট পাওয়া যায়নি।
                      </td>
                    </tr>
                  ) : (
                    filteredProducts.map((p) => {
                      const isLowStock = p.currentStock > 0 && p.currentStock <= p.minStockLevel;
                      const isOutOfStock = p.currentStock <= 0;
                      return (
                        <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                          <td className="py-3 px-4">
                            <div className="font-bold text-slate-900">{p.name}</div>
                            <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-400 font-mono">
                              <span>SKU: {p.sku}</span>
                              <span>•</span>
                              <span>বারকোড: {p.barcode}</span>
                            </div>
                          </td>
                          <td className="py-3 px-3">
                            <div className="font-semibold text-slate-800">{p.brand}</div>
                            <div className="text-[10px] text-slate-400">
                              {p.category} {p.subcategory && `› ${p.subcategory}`}
                            </div>
                          </td>
                          <td className="py-3 px-3 text-center">
                            <span className="px-2 py-0.5 bg-slate-100 rounded text-slate-700 text-[11px] font-medium">
                              {p.unit || 'Piece'}
                            </span>
                          </td>
                          {!isCashier && (
                            <td className="py-3 px-3 text-right font-mono text-slate-600 tabular-nums">
                              {formatBDT(p.purchasePrice)}
                            </td>
                          )}
                          <td className="py-3 px-3 text-right font-mono font-bold text-slate-900 tabular-nums">
                            {formatBDT(p.sellingPrice)}
                          </td>
                          <td className="py-3 px-3 text-center font-mono text-blue-700 font-semibold tabular-nums">
                            {p.openingStock ?? p.currentStock}
                          </td>
                          <td className="py-3 px-3 text-center">
                            <div className="font-mono font-black text-sm tabular-nums">
                              <span
                                className={
                                  isOutOfStock
                                    ? 'text-rose-600 bg-rose-50 px-2 py-0.5 rounded'
                                    : isLowStock
                                    ? 'text-amber-700 bg-amber-50 px-2 py-0.5 rounded'
                                    : 'text-emerald-700'
                                }
                              >
                                {p.currentStock}
                              </span>
                            </div>
                            {isLowStock && (
                              <div className="text-[9px] text-amber-600 font-bold uppercase mt-0.5">
                                স্বল্প স্টক
                              </div>
                            )}
                            {isOutOfStock && (
                              <div className="text-[9px] text-rose-600 font-bold uppercase mt-0.5">
                                স্টক শেষ
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-3 text-center">
                            <StatusBadge status={p.status} />
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1">
                              {!isCashier && (
                                <button
                                  onClick={() => handleOpenEdit(p)}
                                  className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors"
                                  title="এডিট করুন"
                                >
                                  <Edit className="w-3.5 h-3.5" />
                                </button>
                              )}
                              {role === 'ADMIN' && (
                                <button
                                  onClick={() => handleDelete(p.id, p.name)}
                                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
                                  title="ডিলিট করুন"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards View */}
            <div className="sm:hidden divide-y divide-slate-100">
              {filteredProducts.map((p) => (
                <div key={p.id} className="p-4 space-y-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm">{p.name}</h4>
                      <p className="text-[11px] text-slate-500">
                        {p.brand} · {p.category} · {p.unit}
                      </p>
                    </div>
                    <StatusBadge status={p.status} />
                  </div>

                  <div className="grid grid-cols-3 gap-2 bg-slate-50 p-2.5 rounded-lg text-center">
                    <div>
                      <span className="text-[10px] text-slate-400 block">বিক্রয়মূল্য</span>
                      <span className="font-mono font-bold text-slate-900 text-xs">
                        {formatBDT(p.sellingPrice)}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-blue-600 block">ওপেনিং</span>
                      <span className="font-mono font-bold text-blue-700 text-xs">
                        {p.openingStock ?? p.currentStock}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-emerald-600 block">বর্তমান স্টক</span>
                      <span className="font-mono font-black text-emerald-700 text-xs">
                        {p.currentStock}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[10px] font-mono text-slate-400">SKU: {p.sku}</span>
                    <div className="flex items-center gap-2">
                      {!isCashier && (
                        <button
                          onClick={() => handleOpenEdit(p)}
                          className="px-2.5 py-1 text-xs font-semibold text-slate-700 bg-slate-100 rounded-md"
                        >
                          এডিট
                        </button>
                      )}
                      {role === 'ADMIN' && (
                        <button
                          onClick={() => handleDelete(p.id, p.name)}
                          className="px-2.5 py-1 text-xs font-semibold text-rose-600 bg-rose-50 rounded-md"
                        >
                          ডিলিট
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ================= TAB 2: ADD / EDIT PRODUCT FORM ================= */}
      {activeTab === 'ADD_PRODUCT' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 sm:p-7 max-w-4xl mx-auto">
          <div className="flex items-center justify-between pb-4 border-b border-slate-200 mb-6">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                {editingId ? 'প্রোডাক্ট এডিট করুন (Edit Product)' : 'অ্যাড নিউ প্রোডাক্ট (Add New Product)'}
              </h2>
              <p className="text-xs text-slate-500">
                ব্র্যান্ড, ক্যাটাগরি, ইউনিট টাইপ, ওপেনিং স্টক ও ওন স্টক নির্ধারণ করুন
              </p>
            </div>
            <button
              onClick={() => {
                resetForm();
                setActiveTab('LIST');
              }}
              className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
            >
              তালিকায় ফিরে যান
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* SECTION 1: BASIC INFORMATION */}
            <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-200 space-y-3">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Package className="w-3.5 h-3.5 text-amber-600" />
                <span>১. প্রোডাক্ট প্রাথমিক তথ্য (Basic Product Details)</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    প্রোডাক্ট নাম (Product Name) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Hamko Platinum Plus 12V 200Ah"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full text-xs p-2.5 bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    প্রোডাক্ট ধরণ (Type)
                  </label>
                  <select
                    value={form.productType}
                    onChange={(e) => setForm({ ...form, productType: e.target.value as ProductType })}
                    className="w-full text-xs p-2.5 bg-white border border-slate-300 rounded-lg font-medium text-slate-800"
                  >
                    <option value="Battery">Battery (ব্যাটারি)</option>
                    <option value="IPS Battery">IPS Battery (আইপিএস ব্যাটারি)</option>
                    <option value="IPS">IPS Unit (আইপিএস)</option>
                    <option value="Inverter">Inverter (ইনভার্টার)</option>
                    <option value="Solar Product">Solar (সৌর প্যানেল)</option>
                    <option value="Accessories">Accessories (যন্ত্রাংশ)</option>
                    <option value="Other">Other (অন্যান্য)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    SKU কোড
                  </label>
                  <input
                    type="text"
                    value={form.sku}
                    onChange={(e) => setForm({ ...form, sku: e.target.value })}
                    className="w-full text-xs p-2.5 bg-white border border-slate-300 rounded-lg font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    বারকোড (Barcode)
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={form.barcode}
                      onChange={(e) => setForm({ ...form, barcode: e.target.value })}
                      className="w-full text-xs p-2.5 bg-white border border-slate-300 rounded-lg font-mono"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setForm({
                          ...form,
                          barcode: `894${Math.floor(100000000 + Math.random() * 900000000)}`,
                        })
                      }
                      className="absolute right-2 top-2 text-[10px] text-amber-700 font-bold hover:underline"
                    >
                      জেনারেট
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    স্ট্যাটাস (Status)
                  </label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value as any })}
                    className="w-full text-xs p-2.5 bg-white border border-slate-300 rounded-lg font-medium text-slate-800"
                  >
                    <option value="ACTIVE">ACTIVE (বিক্রয়যোগ্য)</option>
                    <option value="INACTIVE">INACTIVE (স্থগিত)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* SECTION 2: BRAND, CATEGORY & UNIT TYPE */}
            <div className="bg-amber-50/40 p-4 rounded-xl border border-amber-200/80 space-y-3">
              <h3 className="text-xs font-bold text-amber-950 uppercase tracking-wider flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-amber-600" />
                <span>২. ব্র্যান্ড, ক্যাটাগরি ও ইউনিট টাইপ (Brand, Category & Unit Type)</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Brand */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-bold text-slate-700 uppercase">
                      ব্র্যান্ড (Brand) <span className="text-rose-500">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowAddBrandModal(true)}
                      className="text-[10px] text-amber-700 hover:underline font-bold"
                    >
                      + নতুন ব্র্যান্ড
                    </button>
                  </div>
                  <select
                    value={form.brand}
                    onChange={(e) => setForm({ ...form, brand: e.target.value })}
                    className="w-full text-xs p-2.5 bg-white border border-slate-300 rounded-lg font-semibold text-slate-900"
                  >
                    {brands.map((b) => (
                      <option key={b.id} value={b.name}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Category */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-bold text-slate-700 uppercase">
                      ক্যাটাগরি (Category) <span className="text-rose-500">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowAddCatModal(true)}
                      className="text-[10px] text-amber-700 hover:underline font-bold"
                    >
                      + নতুন ক্যাটাগরি
                    </button>
                  </div>
                  <select
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className="w-full text-xs p-2.5 bg-white border border-slate-300 rounded-lg font-semibold text-slate-900"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.name}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Unit Type */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-bold text-slate-700 uppercase">
                      ইউনিট টাইপ (Unit Type) <span className="text-rose-500">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowAddUnitModal(true)}
                      className="text-[10px] text-amber-700 hover:underline font-bold"
                    >
                      + নতুন ইউনিট
                    </button>
                  </div>
                  <select
                    value={form.unit}
                    onChange={(e) => setForm({ ...form, unit: e.target.value })}
                    className="w-full text-xs p-2.5 bg-white border border-slate-300 rounded-lg font-semibold text-slate-900"
                  >
                    {units.length > 0 ? (
                      units.map((u) => (
                        <option key={u.id} value={u.name}>
                          {u.name} ({u.shortName})
                        </option>
                      ))
                    ) : (
                      <>
                        <option value="Piece">Piece (পিস)</option>
                        <option value="Box">Box (বক্স)</option>
                        <option value="Set">Set (সেট)</option>
                        <option value="Kg">Kg (কেজি)</option>
                        <option value="Ampere">Ampere (অ্যাম্পিয়ার)</option>
                      </>
                    )}
                  </select>
                </div>
              </div>
            </div>

            {/* SECTION 3: PRODUCT STOCK, OPENING STOCK & OWN STOCK */}
            <div className="bg-blue-50/40 p-4 rounded-xl border border-blue-200/80 space-y-3">
              <h3 className="text-xs font-bold text-blue-950 uppercase tracking-wider flex items-center gap-1.5">
                <Boxes className="w-3.5 h-3.5 text-blue-600" />
                <span>৩. প্রোডাক্ট স্টক, ওপেনিং স্টক ও ওন স্টক (Stock & Opening Balance)</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Opening Stock */}
                <div>
                  <label className="block text-[11px] font-bold text-blue-900 uppercase mb-1">
                    ওপেনিং স্টক (Opening Stock) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={form.openingStock}
                    onChange={(e) => setForm({ ...form, openingStock: Number(e.target.value) })}
                    className="w-full text-xs p-2.5 bg-white border border-blue-300 rounded-lg font-mono font-bold text-blue-950"
                  />
                  <span className="text-[10px] text-blue-600 mt-0.5 block">
                    ব্যবসা শুরুর বা প্রারম্ভিক মজুদ
                  </span>
                </div>

                {/* Own Stock / Current Live Stock */}
                <div>
                  <label className="block text-[11px] font-bold text-emerald-900 uppercase mb-1">
                    ওন স্টক / বর্তমান স্টক (Own Live Stock) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={form.currentStock}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        currentStock: Number(e.target.value),
                        ownStock: Number(e.target.value),
                      })
                    }
                    className="w-full text-xs p-2.5 bg-white border border-emerald-300 rounded-lg font-mono font-bold text-emerald-950"
                  />
                  <span className="text-[10px] text-emerald-600 mt-0.5 block">
                    দোকান বা গোডাউনে বর্তমান ফিজিক্যাল স্টক
                  </span>
                </div>

                {/* Min Safety Stock Level */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    সর্বনিম্ন স্টক সতর্কতা (Min Stock)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={form.minStockLevel}
                    onChange={(e) => setForm({ ...form, minStockLevel: Number(e.target.value) })}
                    className="w-full text-xs p-2.5 bg-white border border-slate-300 rounded-lg font-mono"
                  />
                  <span className="text-[10px] text-slate-500 mt-0.5 block">
                    এই সংখ্যার নিচে নামলে সতর্কতা দেখাবে
                  </span>
                </div>
              </div>
            </div>

            {/* SECTION 4: PRICING & VALUATION */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Scale className="w-3.5 h-3.5 text-slate-600" />
                <span>৪. ক্রয় ও বিক্রয় মূল্য নির্ধারণ (Pricing & Margins)</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {!isCashier && (
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                      ক্রয়মূল্য (Purchase Price ৳) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="number"
                      min="0"
                      required
                      value={form.purchasePrice}
                      onChange={(e) => setForm({ ...form, purchasePrice: Number(e.target.value) })}
                      className="w-full text-xs p-2.5 bg-white border border-slate-300 rounded-lg font-mono font-bold"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    রেগুলার বিক্রয়মূল্য (Selling Price ৳) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={form.sellingPrice}
                    onChange={(e) => setForm({ ...form, sellingPrice: Number(e.target.value) })}
                    className="w-full text-xs p-2.5 bg-white border border-slate-300 rounded-lg font-mono font-bold text-emerald-800"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    সর্বনিম্ন বিক্রয়মূল্য (Min Price ৳)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={form.minSellingPrice}
                    onChange={(e) => setForm({ ...form, minSellingPrice: Number(e.target.value) })}
                    className="w-full text-xs p-2.5 bg-white border border-slate-300 rounded-lg font-mono"
                  />
                </div>
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                বিবরণ / নোট (Description)
              </label>
              <textarea
                rows={2}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="প্রোডাক্ট ওয়ারেন্টি শর্ত, ব্যাটারি স্পেসিফিকেশন ইত্যাদি..."
                className="w-full text-xs p-2.5 bg-white border border-slate-300 rounded-lg focus:outline-hidden"
              />
            </div>

            {/* Submit Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => {
                  resetForm();
                  setActiveTab('LIST');
                }}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
              >
                বাতিল করুন
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center gap-2 px-5 py-2 text-xs font-semibold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-lg shadow-xs transition-colors cursor-pointer disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>সংরক্ষণ হচ্ছে...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>{editingId ? 'আপডেট সম্পন্ন করুন' : 'প্রোডাক্ট সংরক্ষণ করুন'}</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ================= TAB 3: BRANDS, CATEGORIES & UNITS ================= */}
      {activeTab === 'META' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Brands Management */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-3">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                <Tag className="w-4 h-4 text-amber-600" />
                <span>ব্র্যান্ড তালিকা (Brands)</span>
              </h3>
              <span className="text-[10px] font-bold bg-amber-100 text-amber-900 px-2 py-0.5 rounded">
                {brands.length} টি
              </span>
            </div>

            <form onSubmit={handleCreateBrand} className="flex gap-2 mb-3">
              <input
                type="text"
                placeholder="নতুন ব্র্যান্ড নাম..."
                value={newBrandName}
                onChange={(e) => setNewBrandName(e.target.value)}
                className="flex-1 text-xs p-2 bg-slate-50 border border-slate-300 rounded-lg"
              />
              <button
                type="submit"
                className="px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold"
              >
                + যোগ
              </button>
            </form>

            <div className="flex-1 overflow-y-auto space-y-1.5 max-h-72">
              {brands.map((b) => (
                <div
                  key={b.id}
                  className="p-2.5 rounded-lg border border-slate-100 bg-slate-50 flex items-center justify-between text-xs"
                >
                  <span className="font-semibold text-slate-800">{b.name}</span>
                  <span className="text-[10px] text-slate-400 font-mono">{b.code || 'BR'}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Categories Management */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-3">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                <Package className="w-4 h-4 text-blue-600" />
                <span>ক্যাটাগরি তালিকা (Categories)</span>
              </h3>
              <span className="text-[10px] font-bold bg-blue-100 text-blue-900 px-2 py-0.5 rounded">
                {categories.length} টি
              </span>
            </div>

            <form onSubmit={handleCreateCategory} className="flex gap-2 mb-3">
              <input
                type="text"
                placeholder="নতুন ক্যাটাগরি..."
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                className="flex-1 text-xs p-2 bg-slate-50 border border-slate-300 rounded-lg"
              />
              <button
                type="submit"
                className="px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold"
              >
                + যোগ
              </button>
            </form>

            <div className="flex-1 overflow-y-auto space-y-1.5 max-h-72">
              {categories.map((c) => (
                <div
                  key={c.id}
                  className="p-2.5 rounded-lg border border-slate-100 bg-slate-50 flex items-center justify-between text-xs"
                >
                  <span className="font-semibold text-slate-800">{c.name}</span>
                  <span className="text-[10px] text-slate-400">
                    {c.subcategories?.length || 1} উপ-ক্যাটাগরি
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Unit Types Management */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-3">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                <Scale className="w-4 h-4 text-emerald-600" />
                <span>ইউনিট টাইপ (Unit Types)</span>
              </h3>
              <span className="text-[10px] font-bold bg-emerald-100 text-emerald-900 px-2 py-0.5 rounded">
                {units.length} টি
              </span>
            </div>

            <form onSubmit={handleCreateUnit} className="flex gap-2 mb-3">
              <input
                type="text"
                placeholder="নতুন ইউনিট (e.g. Piece, Box)..."
                value={newUnitName}
                onChange={(e) => setNewUnitName(e.target.value)}
                className="flex-1 text-xs p-2 bg-slate-50 border border-slate-300 rounded-lg"
              />
              <button
                type="submit"
                className="px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold"
              >
                + যোগ
              </button>
            </form>

            <div className="flex-1 overflow-y-auto space-y-1.5 max-h-72">
              {units.map((u) => (
                <div
                  key={u.id}
                  className="p-2.5 rounded-lg border border-slate-100 bg-slate-50 flex items-center justify-between text-xs"
                >
                  <span className="font-semibold text-slate-800">{u.name}</span>
                  <span className="text-[10px] text-slate-400 font-mono">{u.shortName}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ================= TAB 4: SUMMARY & VALUATION ================= */}
      {activeTab === 'SUMMARY' && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Category-wise Breakdown */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
              <h3 className="font-bold text-slate-900 text-sm mb-3">
                ক্যাটাগরি-ভিত্তিক স্টক ও মূল্যায়ন
              </h3>
              <div className="space-y-3">
                {categories.map((cat) => {
                  const catProducts = products.filter((p) => p.category === cat.name);
                  const catQty = catProducts.reduce((s, p) => s + (p.currentStock || 0), 0);
                  const catCost = catProducts.reduce(
                    (s, p) => s + (p.currentStock || 0) * (p.purchasePrice || 0),
                    0
                  );
                  return (
                    <div key={cat.id} className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-bold text-slate-800">{cat.name}</span>
                        <span className="font-mono font-bold text-emerald-700">{catQty} টি স্টক</span>
                      </div>
                      <div className="flex justify-between items-center text-[11px] text-slate-500 mt-1">
                        <span>{catProducts.length} টি প্রোডাক্ট</span>
                        <span className="font-mono">{formatBDT(catCost)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Brand-wise Breakdown */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
              <h3 className="font-bold text-slate-900 text-sm mb-3">
                ব্র্যান্ড-ভিত্তিক স্টক ও মজুদ বিবরণী
              </h3>
              <div className="space-y-3">
                {brands.map((brand) => {
                  const brProducts = products.filter((p) => p.brand === brand.name);
                  const brQty = brProducts.reduce((s, p) => s + (p.currentStock || 0), 0);
                  const brVal = brProducts.reduce(
                    (s, p) => s + (p.currentStock || 0) * (p.sellingPrice || 0),
                    0
                  );
                  return (
                    <div key={brand.id} className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-bold text-slate-800">{brand.name}</span>
                        <span className="font-mono font-bold text-amber-700">{brQty} টি স্টক</span>
                      </div>
                      <div className="flex justify-between items-center text-[11px] text-slate-500 mt-1">
                        <span>{brProducts.length} টি মডেল</span>
                        <span className="font-mono">বিক্রয়মূল্য: {formatBDT(brVal)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quick Add Brand Modal */}
      {showAddBrandModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-xl p-5 max-w-sm w-full shadow-2xl border border-slate-200">
            <h4 className="text-sm font-bold text-slate-900 mb-2">নতুন ব্র্যান্ড যুক্ত করুন</h4>
            <input
              type="text"
              placeholder="e.g. Rahimafrooz, Lucas, Hamko"
              value={newBrandName}
              onChange={(e) => setNewBrandName(e.target.value)}
              className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-lg mb-3"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowAddBrandModal(false)}
                className="px-3 py-1.5 text-xs text-slate-600 bg-slate-100 rounded-lg"
              >
                বাতিল
              </button>
              <button
                type="button"
                onClick={handleCreateBrand}
                className="px-4 py-1.5 text-xs font-semibold text-white bg-slate-900 rounded-lg"
              >
                সংরক্ষণ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quick Add Category Modal */}
      {showAddCatModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-xl p-5 max-w-sm w-full shadow-2xl border border-slate-200">
            <h4 className="text-sm font-bold text-slate-900 mb-2">নতুন ক্যাটাগরি যুক্ত করুন</h4>
            <input
              type="text"
              placeholder="e.g. Tubular Battery, Solar Inverter"
              value={newCatName}
              onChange={(e) => setNewCatName(e.target.value)}
              className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-lg mb-3"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowAddCatModal(false)}
                className="px-3 py-1.5 text-xs text-slate-600 bg-slate-100 rounded-lg"
              >
                বাতিল
              </button>
              <button
                type="button"
                onClick={handleCreateCategory}
                className="px-4 py-1.5 text-xs font-semibold text-white bg-slate-900 rounded-lg"
              >
                সংরক্ষণ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quick Add Unit Modal */}
      {showAddUnitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-xl p-5 max-w-sm w-full shadow-2xl border border-slate-200">
            <h4 className="text-sm font-bold text-slate-900 mb-2">নতুন ইউনিট টাইপ যুক্ত করুন</h4>
            <input
              type="text"
              placeholder="e.g. Piece, Box, Set, Kg"
              value={newUnitName}
              onChange={(e) => setNewUnitName(e.target.value)}
              className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-lg mb-3"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowAddUnitModal(false)}
                className="px-3 py-1.5 text-xs text-slate-600 bg-slate-100 rounded-lg"
              >
                বাতিল
              </button>
              <button
                type="button"
                onClick={handleCreateUnit}
                className="px-4 py-1.5 text-xs font-semibold text-white bg-slate-900 rounded-lg"
              >
                সংরক্ষণ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
