import React, { useState, useEffect } from 'react';
import { supplierService } from '../services/supplierService';
import { purchaseService } from '../services/purchaseService';
import { paymentService } from '../services/paymentService';
import { defaultSettings, settingsService } from '../services/settingsService';
import { Supplier, Purchase, SupplierPayment } from '../types';
import { formatBDT, formatDateTime, formatDate } from '../utils/formatters';
import {
  BookOpen,
  Search,
  Printer,
  Calendar,
  Building2,
  Phone,
  Tag,
  ArrowDownLeft,
  ArrowUpRight,
  Receipt,
  Download,
  Filter,
  CheckCircle2,
  Clock,
  Sparkles,
  Layers,
} from 'lucide-react';

export const SupplierLedgerPage: React.FC = () => {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [payments, setPayments] = useState<SupplierPayment[]>([]);
  const [settings, setSettings] = useState(defaultSettings);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'PRODUCT_WISE' | 'CHRONOLOGICAL' | 'PAYMENTS'>('PRODUCT_WISE');

  useEffect(() => {
    setLoading(true);
    const unsubSuppliers = supplierService.subscribeSuppliers((data) => setSuppliers(data));
    const unsubPurchases = purchaseService.subscribePurchases((data) => setPurchases(data));
    const unsubPayments = paymentService.subscribeSupplierPayments((data) => setPayments(data));
    const unsubSettings = settingsService.subscribeSettings((s) => setSettings(s));

    const t = setTimeout(() => setLoading(false), 500);

    return () => {
      unsubSuppliers();
      unsubPurchases();
      unsubPayments();
      unsubSettings();
      clearTimeout(t);
    };
  }, []);

  const selectedSupplier = suppliers.find((s) => s.id === selectedSupplierId);

  // Filter purchases by supplier & date
  const filteredPurchases = purchases.filter((p) => {
    if (selectedSupplierId !== 'ALL' && p.supplierId !== selectedSupplierId) return false;
    if (startDate && new Date(p.date) < new Date(startDate)) return false;
    if (endDate && new Date(p.date) > new Date(endDate + 'T23:59:59')) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchInvoice = p.purchaseNo.toLowerCase().includes(q);
      const matchSup = p.supplierName.toLowerCase().includes(q);
      const matchItem = p.items?.some((i) => i.productName.toLowerCase().includes(q));
      if (!matchInvoice && !matchSup && !matchItem) return false;
    }
    return true;
  });

  // Filter payments by supplier & date
  const filteredPayments = payments.filter((pm) => {
    if (selectedSupplierId !== 'ALL' && pm.supplierId !== selectedSupplierId) return false;
    if (startDate && new Date(pm.date) < new Date(startDate)) return false;
    if (endDate && new Date(pm.date) > new Date(endDate + 'T23:59:59')) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchNo = pm.paymentNo.toLowerCase().includes(q);
      const matchSup = pm.supplierName.toLowerCase().includes(q);
      if (!matchNo && !matchSup) return false;
    }
    return true;
  });

  // KPI Calculations
  const totalGrossPurchases = filteredPurchases.reduce((sum, p) => sum + (p.totalAmount || p.total || 0), 0);
  const totalDiscountReceived = filteredPurchases.reduce((sum, p) => sum + (p.discountAmount || 0), 0);
  const totalNetPurchases = filteredPurchases.reduce((sum, p) => sum + (p.netPayable || p.total || 0), 0);
  const totalPaidThroughPurchases = filteredPurchases.reduce((sum, p) => sum + (p.paidAmount || 0), 0);
  const totalDirectPayments = filteredPayments.reduce((sum, pm) => sum + (pm.amount || 0), 0);
  const totalPaidOverall = totalPaidThroughPurchases + totalDirectPayments;
  
  // Total current due for selected supplier
  const currentOutstandingDue = selectedSupplier
    ? selectedSupplier.currentDue
    : suppliers.reduce((sum, s) => sum + (s.currentDue || 0), 0);

  // Total quantity of items bought
  const totalItemsCount = filteredPurchases.reduce(
    (sum, p) => sum + p.items.reduce((iSum, item) => iSum + (item.quantity || 0), 0),
    0
  );

  const handlePrint = () => {
    window.print();
  };

  const handleResetFilters = () => {
    setSelectedSupplierId('ALL');
    setStartDate('');
    setEndDate('');
    setSearchQuery('');
  };

  return (
    <div className="space-y-6">
      {/* Page Header (No-print) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 no-print">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-amber-500/10 text-amber-700 rounded-lg">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                সাপ্লায়ার লেজার ম্যানেজমেন্ট (Supplier Ledger)
              </h1>
              <p className="text-xs text-slate-500">
                প্রোডাক্ট-ভিত্তিক ক্রয়, ডিসকাউন্ট ছাড়, পরিশোধ এবং রানিং ব্যালেন্স লেজার বিবরণী
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-xs transition-colors cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>লেজার প্রিন্ট করুন (Print Ledger)</span>
          </button>
        </div>
      </div>

      {/* Filter Toolbar (No-print) */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3 no-print">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Supplier Select */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
              সাপ্লায়ার নির্বাচন করুন
            </label>
            <select
              value={selectedSupplierId}
              onChange={(e) => setSelectedSupplierId(e.target.value)}
              className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-lg font-medium text-slate-800 focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-amber-500"
            >
              <option value="ALL">সকল সাপ্লায়ার (All Suppliers)</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.contactPerson}) - বকেয়া: {formatBDT(s.currentDue)}
                </option>
              ))}
            </select>
          </div>

          {/* Date Range: From */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
              হতে (Start Date)
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-700 focus:bg-white focus:outline-hidden"
            />
          </div>

          {/* Date Range: To */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
              পর্যন্ত (End Date)
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-700 focus:bg-white focus:outline-hidden"
            />
          </div>

          {/* Search Query */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
              প্রোডাক্ট / ইনভয়েস খুঁজুন
            </label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                placeholder="প্রোডাক্ট নাম, ইনভয়েস নং..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full text-xs pl-8.5 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-hidden"
              />
            </div>
          </div>
        </div>

        {/* Quick Date Presets & Reset */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] text-slate-400 font-semibold mr-1">দ্রুত ফিল্টার:</span>
            <button
              onClick={() => {
                const today = new Date().toISOString().split('T')[0];
                setStartDate(today);
                setEndDate(today);
              }}
              className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md text-[11px] font-medium"
            >
              আজকে (Today)
            </button>
            <button
              onClick={() => {
                const now = new Date();
                const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
                const today = now.toISOString().split('T')[0];
                setStartDate(firstDay);
                setEndDate(today);
              }}
              className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md text-[11px] font-medium"
            >
              চলতি মাস (This Month)
            </button>
            <button
              onClick={() => {
                const d = new Date();
                d.setDate(d.getDate() - 30);
                setStartDate(d.toISOString().split('T')[0]);
                setEndDate(new Date().toISOString().split('T')[0]);
              }}
              className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md text-[11px] font-medium"
            >
              বিগত ৩০ দিন (Last 30 Days)
            </button>
            <button
              onClick={handleResetFilters}
              className="px-2.5 py-1 text-amber-700 hover:underline text-[11px] font-semibold"
            >
              সব রিসেট
            </button>
          </div>

          {selectedSupplier && (
            <div className="text-[11px] text-slate-600 font-medium">
              নির্বাচিত সাপ্লায়ার:{' '}
              <span className="font-bold text-slate-900">{selectedSupplier.name}</span> | ফোন:{' '}
              <span className="font-mono">{selectedSupplier.phone}</span>
            </div>
          )}
        </div>
      </div>

      {/* Summary KPI Cards (Printed as well) */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Purchases */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">মোট ক্রয় (Purchases)</span>
            <Layers className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900 font-mono tabular-nums">
            {formatBDT(totalGrossPurchases)}
          </div>
          <div className="text-[10px] text-slate-400 mt-1">
            {filteredPurchases.length} টি ক্রয় চালান | {totalItemsCount} টি আইটেম
          </div>
        </div>

        {/* Total Discount Received */}
        <div className="bg-emerald-50/50 border border-emerald-200/80 p-4 rounded-xl shadow-2xs">
          <div className="flex items-center justify-between text-emerald-800 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">প্রাপ্ত ডিসকাউন্ট (Discount)</span>
            <Tag className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-emerald-700 font-mono tabular-nums">
            {formatBDT(totalDiscountReceived)}
          </div>
          <div className="text-[10px] text-emerald-600 mt-1">
            সাপ্লায়ার থেকে সরাসরি প্রাপ্ত বিশেষ ছাড়
          </div>
        </div>

        {/* Total Paid */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">মোট পরিশোধ (Paid)</span>
            <ArrowUpRight className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900 font-mono tabular-nums">
            {formatBDT(totalPaidOverall)}
          </div>
          <div className="text-[10px] text-slate-400 mt-1">
            ইনভয়েস পরিশোধ + পৃথক ভাউচার পেমেন্ট
          </div>
        </div>

        {/* Current Outstanding Due */}
        <div className="bg-rose-50/50 border border-rose-200/80 p-4 rounded-xl shadow-2xs">
          <div className="flex items-center justify-between text-rose-800 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">বর্তমান বকেয়া (Payable)</span>
            <ArrowDownLeft className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-rose-700 font-mono tabular-nums">
            {formatBDT(currentOutstandingDue)}
          </div>
          <div className="text-[10px] text-rose-600 mt-1">
            {selectedSupplier ? `${selectedSupplier.name}-এর জের` : 'সকল সাপ্লায়ারের মোট বকেয়া'}
          </div>
        </div>
      </div>

      {/* Printable Ledger Document Section */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden printable-area">
        {/* Printable Letterhead (shown on print & on top of statement) */}
        <div className="p-6 border-b border-slate-200 bg-slate-50/50">
          <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-8 h-8 rounded-lg bg-amber-500 text-slate-950 flex items-center justify-center font-black text-sm">
                  VP
                </div>
                <div>
                  <h2 className="text-lg font-black text-slate-900 tracking-tight">
                    {settings.shopName}
                  </h2>
                  <p className="text-[11px] text-slate-500">{settings.tagline}</p>
                </div>
              </div>
              <p className="text-xs text-slate-600">{settings.address}</p>
              <p className="text-xs text-slate-500 font-mono">ফোন: {settings.phone} | ইমেইল: {settings.email}</p>
            </div>

            <div className="text-left sm:text-right bg-white p-3 rounded-lg border border-slate-200 shadow-2xs">
              <span className="inline-block px-2 py-0.5 bg-amber-100 text-amber-900 rounded font-bold text-[10px] uppercase tracking-wider mb-1">
                সাপ্লায়ার লেজার স্টেটমেন্ট (Supplier Ledger Statement)
              </span>
              <div className="text-xs font-semibold text-slate-800">
                তারিখ রেঞ্জ: {startDate ? formatDate(startDate) : 'শুরু থেকে'} -{' '}
                {endDate ? formatDate(endDate) : 'বর্তমান পর্যন্ত'}
              </div>
              <div className="text-[11px] text-slate-500">
                প্রিন্ট সময়: {formatDateTime(new Date().toISOString())}
              </div>
            </div>
          </div>

          {/* Supplier Info Box */}
          {selectedSupplier && (
            <div className="mt-4 pt-4 border-t border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-3 bg-white p-3.5 rounded-lg border border-slate-100">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  সাপ্লায়ার নাম ও প্রতিষ্ঠান
                </span>
                <span className="text-sm font-bold text-slate-900">{selectedSupplier.name}</span>
                <div className="text-xs text-slate-600">{selectedSupplier.contactPerson}</div>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  যোগাযোগ ও ঠিকানা
                </span>
                <div className="text-xs text-slate-800 font-mono">{selectedSupplier.phone}</div>
                <div className="text-xs text-slate-500">{selectedSupplier.address || 'ঠিকানা দেওয়া নেই'}</div>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  হিসাবের বর্তমান অবস্থা
                </span>
                <div className="text-xs text-slate-700">
                  ক্রেডিট লিমিট: <span className="font-mono font-semibold">{formatBDT(selectedSupplier.creditLimit)}</span>
                </div>
                <div className="text-sm font-black text-rose-700 font-mono">
                  বর্তমান মোট বকেয়া: {formatBDT(selectedSupplier.currentDue)}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* View Tabs (No-print) */}
        <div className="flex items-center justify-between border-b border-slate-200 px-4 bg-slate-50 no-print">
          <div className="flex items-center gap-1 -mb-px">
            <button
              onClick={() => setActiveTab('PRODUCT_WISE')}
              className={`py-3 px-4 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
                activeTab === 'PRODUCT_WISE'
                  ? 'border-amber-500 text-amber-700 bg-white'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              📦 প্রোডাক্ট-ভিত্তিক ক্রয় ও ডিসকাউন্ট (Product-wise Breakdown)
            </button>
            <button
              onClick={() => setActiveTab('PAYMENTS')}
              className={`py-3 px-4 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
                activeTab === 'PAYMENTS'
                  ? 'border-amber-500 text-amber-700 bg-white'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              💳 পেমেন্ট ও পরিশোধ ভাউচার (Payment Vouchers)
            </button>
            <button
              onClick={() => setActiveTab('CHRONOLOGICAL')}
              className={`py-3 px-4 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
                activeTab === 'CHRONOLOGICAL'
                  ? 'border-amber-500 text-amber-700 bg-white'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              📊 রানিং ব্যালেন্স লেজার (Running Balance Journal)
            </button>
          </div>
          <span className="text-xs text-slate-400 font-medium hidden sm:inline">
            মোট {filteredPurchases.length} টি ক্রয় চালান
          </span>
        </div>

        {/* 1. PRODUCT-WISE BREAKDOWN TAB */}
        {(activeTab === 'PRODUCT_WISE' || false) && (
          <div className="p-4 sm:p-6 space-y-6">
            {filteredPurchases.length === 0 ? (
              <div className="py-12 text-center text-slate-400">
                <Receipt className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <p>কোন ক্রয় লেনদেন পাওয়া যায়নি।</p>
              </div>
            ) : (
              filteredPurchases.map((pur, idx) => (
                <div
                  key={pur.id || idx}
                  className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs"
                >
                  {/* Purchase Invoice Header */}
                  <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <span className="font-mono font-bold text-xs bg-slate-900 text-white px-2 py-0.5 rounded">
                        #{pur.purchaseNo}
                      </span>
                      <span className="text-xs font-semibold text-slate-800">
                        সাপ্লায়ার: <span className="text-slate-900">{pur.supplierName}</span>
                      </span>
                      <span className="text-xs text-slate-500 font-mono">
                        তারিখ: {formatDateTime(pur.date)}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-slate-500">
                        চালান অবস্থা:{' '}
                        <span
                          className={`font-bold ${
                            pur.status === 'RECEIVED'
                              ? 'text-emerald-700'
                              : pur.status === 'PARTIAL'
                              ? 'text-amber-700'
                              : 'text-slate-700'
                          }`}
                        >
                          {pur.status}
                        </span>
                      </span>
                    </div>
                  </div>

                  {/* Product-wise Items Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-100/70 text-slate-600 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200">
                        <tr>
                          <th className="py-2.5 px-4 w-12 text-center">#</th>
                          <th className="py-2.5 px-4">প্রোডাক্ট নাম ও বিবরণ (Product & Details)</th>
                          <th className="py-2.5 px-3 text-center">পরিমাণ (Qty)</th>
                          <th className="py-2.5 px-3 text-center">ইউনিট (Unit)</th>
                          <th className="py-2.5 px-4 text-right">ক্রয় দর (Purchase Price)</th>
                          <th className="py-2.5 px-4 text-right">মোট টাকা (Subtotal)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {pur.items.map((item, iIdx) => (
                          <tr key={iIdx} className="hover:bg-slate-50/50">
                            <td className="py-2.5 px-4 text-center font-mono text-slate-400">
                              {iIdx + 1}
                            </td>
                            <td className="py-2.5 px-4 font-medium text-slate-900">
                              <div>{item.productName}</div>
                            </td>
                            <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-800">
                              {item.quantity}
                            </td>
                            <td className="py-2.5 px-3 text-center text-slate-500">
                              {item.unit || 'Piece'}
                            </td>
                            <td className="py-2.5 px-4 text-right font-mono tabular-nums text-slate-700">
                              {formatBDT(item.purchaseCost)}
                            </td>
                            <td className="py-2.5 px-4 text-right font-mono font-bold tabular-nums text-slate-900">
                              {formatBDT(item.total)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Purchase Financial Breakdown Footnote */}
                  <div className="bg-slate-50/80 px-4 py-3 border-t border-slate-200 flex flex-wrap items-center justify-between gap-4 text-xs">
                    <div className="text-slate-500">
                      পেমেন্ট মেথড: <span className="font-semibold text-slate-800">{pur.paymentMethod}</span>
                      {pur.notes && <span className="ml-2 italic">({pur.notes})</span>}
                    </div>

                    <div className="flex items-center gap-4 sm:gap-6">
                      <div>
                        <span className="text-[10px] text-slate-500 block uppercase">গ্রস মোট</span>
                        <span className="font-mono font-semibold text-slate-800">
                          {formatBDT(pur.totalAmount || pur.total)}
                        </span>
                      </div>

                      <div className="bg-emerald-100/80 px-3 py-1 rounded-md border border-emerald-200">
                        <span className="text-[10px] text-emerald-800 block uppercase font-bold">
                          প্রাপ্ত ডিসকাউন্ট ছাড়
                        </span>
                        <span className="font-mono font-black text-emerald-700">
                          {pur.discountAmount && pur.discountAmount > 0
                            ? `-${formatBDT(pur.discountAmount)}`
                            : '৳০'}
                        </span>
                      </div>

                      <div>
                        <span className="text-[10px] text-slate-500 block uppercase">নিট প্রদেয়</span>
                        <span className="font-mono font-bold text-slate-900">
                          {formatBDT(pur.netPayable || pur.total)}
                        </span>
                      </div>

                      <div>
                        <span className="text-[10px] text-slate-500 block uppercase">পরিশোধ</span>
                        <span className="font-mono font-bold text-emerald-700">
                          {formatBDT(pur.paidAmount)}
                        </span>
                      </div>

                      <div>
                        <span className="text-[10px] text-slate-500 block uppercase">বকেয়া চালানে</span>
                        <span className="font-mono font-bold text-rose-700">
                          {formatBDT(pur.dueAmount)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* 2. PAYMENTS TAB */}
        {activeTab === 'PAYMENTS' && (
          <div className="p-4 sm:p-6">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-100/70 text-slate-600 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">ভাউচার নং (Payment No)</th>
                    <th className="py-3 px-3">তারিখ</th>
                    <th className="py-3 px-4">সাপ্লায়ার</th>
                    <th className="py-3 px-3">পদ্ধতি (Method)</th>
                    <th className="py-3 px-3">রেফারেন্স / নোট</th>
                    <th className="py-3 px-4 text-right">পরিশোধকৃত টাকা (Amount Paid)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredPayments.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400">
                        কোন পৃথক পেমেন্ট ভাউচার পাওয়া যায়নি।
                      </td>
                    </tr>
                  ) : (
                    filteredPayments.map((pm) => (
                      <tr key={pm.id} className="hover:bg-slate-50">
                        <td className="py-3 px-4 font-mono font-bold text-slate-900">
                          {pm.paymentNo}
                        </td>
                        <td className="py-3 px-3 text-slate-600 whitespace-nowrap">
                          {formatDateTime(pm.date)}
                        </td>
                        <td className="py-3 px-4 font-medium text-slate-900">
                          {pm.supplierName}
                        </td>
                        <td className="py-3 px-3">
                          <span className="px-2 py-0.5 bg-slate-100 rounded text-slate-700 font-mono text-[10px]">
                            {pm.paymentMethod}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-slate-500">
                          {pm.reference || pm.notes || '-'}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-black text-emerald-700 tabular-nums">
                          {formatBDT(pm.amount)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 3. CHRONOLOGICAL RUNNING BALANCE JOURNAL */}
        {activeTab === 'CHRONOLOGICAL' && (
          <div className="p-4 sm:p-6">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-100/70 text-slate-600 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">তারিখ</th>
                    <th className="py-3 px-3">ভাউচার / বিবরণ</th>
                    <th className="py-3 px-4">সাপ্লায়ার</th>
                    <th className="py-3 px-3 text-right">ক্রয় নিট (Credit +)</th>
                    <th className="py-3 px-3 text-right text-emerald-700">ডিসকাউন্ট ছাড় (-)</th>
                    <th className="py-3 px-3 text-right text-blue-700">পরিশোধ (Debit -)</th>
                    <th className="py-3 px-4 text-right font-bold">ব্যালেন্স জের (Due)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredPurchases.map((p, idx) => (
                    <tr key={p.id || idx} className="hover:bg-slate-50">
                      <td className="py-2.5 px-4 text-slate-600 whitespace-nowrap">
                        {formatDate(p.date)}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="font-mono font-bold text-slate-900">#{p.purchaseNo}</span>
                        <span className="text-[10px] text-slate-400 block">
                          {p.items?.length} টি প্রোডাক্ট ক্রয়
                        </span>
                      </td>
                      <td className="py-2.5 px-4 font-medium text-slate-800">{p.supplierName}</td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-900 font-semibold">
                        {formatBDT(p.totalAmount || p.total)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-emerald-700 font-bold">
                        {p.discountAmount && p.discountAmount > 0 ? `-${formatBDT(p.discountAmount)}` : '৳০'}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-blue-700 font-semibold">
                        {formatBDT(p.paidAmount)}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono font-black text-rose-700">
                        {formatBDT(p.dueAmount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Official Printable Signatures & Stamp Section (Visible on Print) */}
        <div className="p-8 border-t border-slate-200 mt-6 grid grid-cols-3 gap-6 text-center text-xs text-slate-600">
          <div>
            <div className="border-t border-dashed border-slate-400 pt-2 font-semibold">
              হিসাবরক্ষক (Prepared By)
            </div>
          </div>
          <div>
            <div className="border-t border-dashed border-slate-400 pt-2 font-semibold">
              সাপ্লায়ার প্রতিনিধি স্বাক্ষর (Supplier Signature)
            </div>
          </div>
          <div>
            <div className="border-t border-dashed border-slate-400 pt-2 font-semibold">
              কর্তৃপক্ষের অনুমোদন (Authorized Signatory)
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
