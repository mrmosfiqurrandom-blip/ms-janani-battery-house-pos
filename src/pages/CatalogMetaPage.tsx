import React, { useState, useEffect } from 'react';
import { productService } from '../services/productService';
import { Brand, Category, Unit } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { useToast } from '../context/ToastContext';
import { Plus, Tag, Layers, Scale } from 'lucide-react';

export const CatalogMetaPage: React.FC = () => {
  const { success, error } = useToast();
  const [brands, setBrands] = useState<Brand[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);

  // Brand modal
  const [brandModalOpen, setBrandModalOpen] = useState(false);
  const [brandName, setBrandName] = useState('');
  const [brandCode, setBrandCode] = useState('');
  const [brandDesc, setBrandDesc] = useState('');

  // Category modal
  const [catModalOpen, setCatModalOpen] = useState(false);
  const [catName, setCatName] = useState('');
  const [catSubs, setCatSubs] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [brs, cats, uns] = await Promise.all([
        productService.getBrands(),
        productService.getCategories(),
        productService.getUnits(),
      ]);
      setBrands(brs);
      setCategories(cats);
      setUnits(uns);
    } catch {
      error('Failed to load catalog metadata');
    }
  };

  const handleAddBrand = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!brandName.trim()) return;
    try {
      await productService.createBrand({
        name: brandName,
        code: brandCode || brandName.slice(0, 3).toUpperCase(),
        description: brandDesc,
        status: 'ACTIVE',
      });
      success('Brand Created', `${brandName} added to registry`);
      setBrandModalOpen(false);
      setBrandName('');
      setBrandCode('');
      setBrandDesc('');
      loadData();
    } catch {
      error('Failed to create brand');
    }
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catName.trim()) return;
    try {
      const subcategories = catSubs
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      await productService.createCategory({
        name: catName,
        subcategories,
        status: 'ACTIVE',
      });
      success('Category Created', `${catName} added to registry`);
      setCatModalOpen(false);
      setCatName('');
      setCatSubs('');
      loadData();
    } catch {
      error('Failed to create category');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900 tracking-tight">
          Brands, Categories & Measurement Units
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Standardized classifications for hardware batteries, inverters, and automotive spares
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* ================= BRANDS COLUMN ================= */}
        <div className="bg-white rounded-lg border border-slate-200 shadow-xs p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-3">
              <div className="flex items-center gap-1.5 font-bold text-xs text-slate-800">
                <Tag className="w-4 h-4 text-amber-600" />
                <span>Manufacturers & Brands</span>
              </div>
              <button
                onClick={() => setBrandModalOpen(true)}
                className="p-1 rounded bg-slate-900 hover:bg-slate-800 text-white"
                title="Add Brand"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1 text-xs">
              {brands.map((b) => (
                <div key={b.id} className="p-2.5 rounded bg-slate-50 border border-slate-100">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-slate-900">{b.name}</span>
                    <span className="font-mono text-[10px] text-slate-500 bg-white px-1.5 py-0.5 rounded border border-slate-200">
                      {b.code}
                    </span>
                  </div>
                  {b.description && (
                    <p className="text-[10px] text-slate-500 mt-1">{b.description}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ================= CATEGORIES COLUMN ================= */}
        <div className="bg-white rounded-lg border border-slate-200 shadow-xs p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-3">
              <div className="flex items-center gap-1.5 font-bold text-xs text-slate-800">
                <Layers className="w-4 h-4 text-blue-600" />
                <span>Product Categories</span>
              </div>
              <button
                onClick={() => setCatModalOpen(true)}
                className="p-1 rounded bg-slate-900 hover:bg-slate-800 text-white"
                title="Add Category"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1 text-xs">
              {categories.map((c) => (
                <div key={c.id} className="p-2.5 rounded bg-slate-50 border border-slate-100">
                  <div className="font-semibold text-slate-900">{c.name}</div>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {c.subcategories.map((sub, i) => (
                      <span
                        key={i}
                        className="text-[10px] bg-white px-1.5 py-0.5 rounded border border-slate-200 text-slate-600"
                      >
                        {sub}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ================= UNITS COLUMN ================= */}
        <div className="bg-white rounded-lg border border-slate-200 shadow-xs p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-3">
              <div className="flex items-center gap-1.5 font-bold text-xs text-slate-800">
                <Scale className="w-4 h-4 text-emerald-600" />
                <span>Measurement Units</span>
              </div>
            </div>

            <div className="space-y-2 text-xs">
              {units.map((u) => (
                <div
                  key={u.id}
                  className="flex items-center justify-between p-2.5 rounded bg-slate-50 border border-slate-100"
                >
                  <span className="font-semibold text-slate-900">{u.name}</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] bg-white px-2 py-0.5 rounded border border-slate-200 text-slate-600 font-bold">
                      {u.shortName}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {u.allowDecimal ? 'Decimal allowed' : 'Whole units'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Add Brand Modal */}
      {brandModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-lg border border-slate-200 shadow-xl max-w-sm w-full p-5 text-xs">
            <h3 className="text-sm font-bold text-slate-900 mb-3">Add Brand</h3>
            <form onSubmit={handleAddBrand} className="space-y-3">
              <div>
                <label className="block text-slate-700 font-medium mb-1">Brand Name</label>
                <input
                  type="text"
                  required
                  value={brandName}
                  onChange={(e) => setBrandName(e.target.value)}
                  placeholder="e.g. Navana Batteries"
                  className="w-full p-2 border border-slate-300 rounded"
                />
              </div>
              <div>
                <label className="block text-slate-700 font-medium mb-1">Short Code</label>
                <input
                  type="text"
                  value={brandCode}
                  onChange={(e) => setBrandCode(e.target.value)}
                  placeholder="e.g. NVN"
                  className="w-full p-2 border border-slate-300 rounded font-mono"
                />
              </div>
              <div>
                <label className="block text-slate-700 font-medium mb-1">Description</label>
                <input
                  type="text"
                  value={brandDesc}
                  onChange={(e) => setBrandDesc(e.target.value)}
                  placeholder="e.g. Lead-acid and solar products"
                  className="w-full p-2 border border-slate-300 rounded"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setBrandModalOpen(false)}
                  className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 font-semibold text-white bg-slate-900 rounded"
                >
                  Save Brand
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Category Modal */}
      {catModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-lg border border-slate-200 shadow-xl max-w-sm w-full p-5 text-xs">
            <h3 className="text-sm font-bold text-slate-900 mb-3">Add Category</h3>
            <form onSubmit={handleAddCategory} className="space-y-3">
              <div>
                <label className="block text-slate-700 font-medium mb-1">Category Name</label>
                <input
                  type="text"
                  required
                  value={catName}
                  onChange={(e) => setCatName(e.target.value)}
                  placeholder="e.g. Solar Power"
                  className="w-full p-2 border border-slate-300 rounded"
                />
              </div>
              <div>
                <label className="block text-slate-700 font-medium mb-1">
                  Subcategories (comma separated)
                </label>
                <input
                  type="text"
                  value={catSubs}
                  onChange={(e) => setCatSubs(e.target.value)}
                  placeholder="e.g. Solar Panel, MPPT Controller, Solar Inverter"
                  className="w-full p-2 border border-slate-300 rounded"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setCatModalOpen(false)}
                  className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 font-semibold text-white bg-slate-900 rounded"
                >
                  Save Category
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
