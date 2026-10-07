import React, { useState, useEffect } from 'react';
import { settingsService } from '../services/settingsService';
import { seedService } from '../services/seedService';
import { ShopSettings } from '../types';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { Settings, Save, CheckCircle2, Database, Sparkles, Loader2, RefreshCw } from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const { success, error, info } = useToast();
  const { user, loginWithEmail } = useAuth();
  const [settings, setSettings] = useState<ShopSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [seeding, setSeeding] = useState(false);

  useEffect(() => {
    // Real-time listener for settings
    const unsub = settingsService.subscribeSettings(
      (s) => {
        setSettings(s);
        setLoading(false);
      },
      (err) => {
        console.error(err);
        setLoading(false);
      }
    );
    return () => unsub();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;
    setSaving(true);
    try {
      await settingsService.updateSettings(settings);
      success('Settings Saved', 'Business configuration updated in Firestore.');
    } catch (err: any) {
      error('Failed to save settings', err.message || 'Firestore write error');
    } finally {
      setSaving(false);
    }
  };

  const handleLoadSampleData = async () => {
    setSeeding(true);
    info('Loading Sample Data', 'Writing initial products, categories, customers, suppliers & test transactions to Firestore...');
    try {
      // If not logged in, auto-login with admin demo account to ensure Firestore permission
      if (!user) {
        await loginWithEmail('admin@janani.com', 'admin123', 'admin');
      }

      const res = await seedService.seedAllData(user?.email || 'admin@janani.com');
      if (res.success) {
        success('Database Initialized', res.message);
      } else {
        error('Notice', res.message);
      }
    } catch (err: any) {
      error('Seeding Error', err?.message || 'Failed to seed sample data into Firestore.');
    } finally {
      setSeeding(false);
    }
  };

  if (loading || !settings) {
    return (
      <div className="flex items-center justify-center p-12 text-slate-400 gap-2">
        <Loader2 className="w-5 h-5 animate-spin text-amber-500" />
        <span className="text-xs">Loading settings from Firestore...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-xl font-bold text-slate-900 tracking-tight">System & Shop Settings</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Configure business details, invoice printing formats, currencies, and initialize test data
        </p>
      </div>

      {/* ================= ONE-CLICK LOAD SAMPLE DATA BANNER ================= */}
      <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-300/80 rounded-xl p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-500 text-slate-950 flex items-center justify-center shrink-0 shadow-xs">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <span>Firestore Database Testing Suite</span>
                <span className="px-1.5 py-0.2 bg-amber-200 text-amber-900 text-[10px] font-bold rounded">
                  1-Click Setup
                </span>
              </h2>
              <p className="text-xs text-slate-600 mt-0.5 max-w-xl leading-relaxed">
                Populate all 16 collections in Firestore (products, categories, customers, suppliers,
                sales, sale_items, purchases, purchase_items, stock_movements, payments, expenses, buyback_records)
                with complete acceptance test data.
              </p>
            </div>
          </div>

          <button
            type="button"
            disabled={seeding}
            onClick={handleLoadSampleData}
            className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-slate-950 font-bold text-xs rounded-lg transition-all flex items-center justify-center gap-2 shadow-xs shrink-0 disabled:opacity-60 cursor-pointer"
          >
            {seeding ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                <span>Populating Firestore...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 fill-current" />
                <span>Load Sample Data</span>
              </>
            )}
          </button>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-5 text-xs">
        {/* Shop Profile */}
        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-xs space-y-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700">
            Business Profile & Address
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-700 font-medium mb-1">Shop Name</label>
              <input
                type="text"
                value={settings.shopName}
                onChange={(e) => setSettings({ ...settings, shopName: e.target.value })}
                className="w-full p-2 border border-slate-300 rounded focus:ring-1 focus:ring-amber-500"
              />
            </div>
            <div>
              <label className="block text-slate-700 font-medium mb-1">Tagline</label>
              <input
                type="text"
                value={settings.tagline}
                onChange={(e) => setSettings({ ...settings, tagline: e.target.value })}
                className="w-full p-2 border border-slate-300 rounded focus:ring-1 focus:ring-amber-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-700 font-medium mb-1">Shop Address</label>
            <input
              type="text"
              value={settings.address}
              onChange={(e) => setSettings({ ...settings, address: e.target.value })}
              className="w-full p-2 border border-slate-300 rounded focus:ring-1 focus:ring-amber-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-slate-700 font-medium mb-1">Contact Phone</label>
              <input
                type="text"
                value={settings.phone}
                onChange={(e) => setSettings({ ...settings, phone: e.target.value })}
                className="w-full p-2 border border-slate-300 rounded"
              />
            </div>
            <div>
              <label className="block text-slate-700 font-medium mb-1">Sales Email</label>
              <input
                type="email"
                value={settings.email}
                onChange={(e) => setSettings({ ...settings, email: e.target.value })}
                className="w-full p-2 border border-slate-300 rounded"
              />
            </div>
            <div>
              <label className="block text-slate-700 font-medium mb-1">Website</label>
              <input
                type="text"
                value={settings.website}
                onChange={(e) => setSettings({ ...settings, website: e.target.value })}
                className="w-full p-2 border border-slate-300 rounded"
              />
            </div>
          </div>
        </div>

        {/* Invoice & Print Configuration */}
        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-xs space-y-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700">
            Invoice & Printing Preferences
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-700 font-medium mb-1">Invoice Number Prefix</label>
              <input
                type="text"
                value={settings.invoicePrefix}
                onChange={(e) => setSettings({ ...settings, invoicePrefix: e.target.value })}
                className="w-full p-2 border border-slate-300 rounded font-mono"
              />
            </div>
            <div>
              <label className="block text-slate-700 font-medium mb-1">
                Receipt Paper Format
              </label>
              <select
                value={settings.receiptSize}
                onChange={(e) =>
                  setSettings({ ...settings, receiptSize: e.target.value as 'A4' | 'POS_80MM' })
                }
                className="w-full p-2 border border-slate-300 rounded bg-white"
              >
                <option value="POS_80MM">Thermal POS (80mm / 3-inch roll)</option>
                <option value="A4">Standard Office Paper (A4 / Letter)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-slate-700 font-medium mb-1">Invoice Disclaimer & Terms</label>
            <textarea
              rows={2}
              value={settings.invoiceFooter}
              onChange={(e) => setSettings({ ...settings, invoiceFooter: e.target.value })}
              className="w-full p-2 border border-slate-300 rounded text-slate-600"
            />
          </div>
        </div>

        {/* Currency & Thresholds */}
        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-xs space-y-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700">
            Currency & Inventory Alerts
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-slate-700 font-medium mb-1">Currency Code</label>
              <input
                type="text"
                disabled
                value={settings.currency}
                className="w-full p-2 bg-slate-50 border border-slate-300 rounded text-slate-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-medium mb-1">Currency Symbol</label>
              <input
                type="text"
                disabled
                value={settings.currencySymbol}
                className="w-full p-2 bg-slate-50 border border-slate-300 rounded text-slate-500 font-mono text-base font-bold"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-medium mb-1">
                Global Low Stock Threshold
              </label>
              <input
                type="number"
                min="1"
                value={settings.lowStockThreshold}
                onChange={(e) =>
                  setSettings({ ...settings, lowStockThreshold: Number(e.target.value) || 5 })
                }
                className="w-full p-2 border border-slate-300 rounded font-mono"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="submit"
            disabled={saving}
            className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs rounded transition-colors inline-flex items-center gap-1.5 shadow-xs disabled:opacity-60"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            <span>Save All Settings</span>
          </button>
        </div>
      </form>
    </div>
  );
};
