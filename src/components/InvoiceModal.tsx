import React, { useState, useEffect } from 'react';
import { Sale } from '../types';
import { formatBDT, formatDateTime } from '../utils/formatters';
import { Printer, X, FileText, CheckCircle2 } from 'lucide-react';
import { defaultSettings, settingsService } from '../services/settingsService';

interface InvoiceModalProps {
  isOpen: boolean;
  sale: Sale | null;
  onClose: () => void;
}

export const InvoiceModal: React.FC<InvoiceModalProps> = ({ isOpen, sale, onClose }) => {
  const [layoutMode, setLayoutMode] = useState<'A4' | 'THERMAL'>('A4');
  const [settings, setSettings] = useState(defaultSettings);

  useEffect(() => {
    const unsub = settingsService.subscribeSettings((s) => setSettings(s));
    return () => unsub();
  }, []);

  if (!isOpen || !sale) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-lg border border-slate-200 shadow-2xl max-w-3xl w-full my-6 flex flex-col max-h-[92vh]">
        {/* Top Action Bar (hidden when printing) */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200 bg-slate-50 rounded-t-lg no-print">
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold text-slate-800">
              Invoice #{sale.invoiceNo}
            </span>
            <div className="flex items-center bg-slate-200 p-0.5 rounded-md text-xs font-medium">
              <button
                type="button"
                onClick={() => setLayoutMode('A4')}
                className={`px-2.5 py-1 rounded transition-colors ${
                  layoutMode === 'A4' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Standard A4
              </button>
              <button
                type="button"
                onClick={() => setLayoutMode('THERMAL')}
                className={`px-2.5 py-1 rounded transition-colors ${
                  layoutMode === 'THERMAL' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                POS 80mm Receipt
              </button>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-md transition-colors shadow-xs"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Invoice</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 rounded-md transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Printable Invoice Container */}
        <div className="overflow-y-auto p-6 sm:p-8 flex justify-center bg-slate-100/50">
          {layoutMode === 'A4' ? (
            /* ================= STANDARD A4 INVOICE ================= */
            <div className="w-full max-w-2xl bg-white p-8 border border-slate-200 shadow-xs text-slate-800 text-xs font-sans">
              {/* Header */}
              <div className="flex justify-between items-start border-b border-slate-200 pb-5">
                <div>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded bg-amber-500 text-slate-950 flex items-center justify-center font-bold text-base">
                      VP
                    </div>
                    <div>
                      <h1 className="text-base font-bold text-slate-900 tracking-tight">
                        {settings.shopName}
                      </h1>
                      <p className="text-[11px] text-slate-500">{settings.tagline}</p>
                    </div>
                  </div>
                  <p className="mt-2 text-slate-600 max-w-xs">{settings.address}</p>
                  <p className="text-slate-500">Phone: {settings.phone}</p>
                  <p className="text-slate-500">Email: {settings.email}</p>
                </div>

                <div className="text-right">
                  <div className="inline-block px-2.5 py-1 bg-slate-100 rounded text-slate-800 font-bold uppercase tracking-wider text-[11px] mb-2">
                    TAX / RETAIL INVOICE
                  </div>
                  <p className="font-semibold text-slate-900">
                    Invoice No: <span className="font-mono tabular-nums">{sale.invoiceNo}</span>
                  </p>
                  <p className="text-slate-500">
                    Date: <span className="font-mono tabular-nums">{formatDateTime(sale.date)}</span>
                  </p>
                  <p className="text-slate-500">
                    Status:{' '}
                    <span className="font-semibold text-emerald-700">
                      {sale.status.toUpperCase()}
                    </span>
                  </p>
                </div>
              </div>

              {/* Billed To */}
              <div className="grid grid-cols-2 gap-4 my-5 bg-slate-50 p-3.5 rounded border border-slate-100">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Billed To
                  </span>
                  <p className="font-bold text-slate-900 text-sm">{sale.customerName}</p>
                  {sale.customerPhone && (
                    <p className="text-slate-600">Phone: {sale.customerPhone}</p>
                  )}
                  <p className="text-slate-500 text-[11px]">Walk-in / Authorized Account</p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Payment Info
                  </span>
                  <p className="text-slate-700">
                    Method: <span className="font-semibold">{sale.paymentMethod}</span>
                  </p>
                  <p className="text-slate-700">
                    Salesperson: <span className="font-semibold">{sale.createdBy}</span>
                  </p>
                </div>
              </div>

              {/* New Products Purchased Table */}
              <div className="mb-4">
                <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1.5">
                  Sold Items & Services
                </span>
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b border-slate-300 text-slate-500 text-[11px] text-left">
                      <th className="py-2">Item Description</th>
                      <th className="py-2">SKU</th>
                      <th className="py-2 text-right">Unit Price</th>
                      <th className="py-2 text-center">Qty</th>
                      <th className="py-2 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {sale.items.map((item, idx) => (
                      <tr key={idx}>
                        <td className="py-2.5 font-medium text-slate-900">
                          {item.productName}
                        </td>
                        <td className="py-2.5 text-slate-500 font-mono text-[11px]">
                          {item.sku}
                        </td>
                        <td className="py-2.5 text-right font-mono tabular-nums">
                          {formatBDT(item.unitPrice)}
                        </td>
                        <td className="py-2.5 text-center font-mono tabular-nums">
                          {item.quantity} {item.unit}
                        </td>
                        <td className="py-2.5 text-right font-semibold font-mono tabular-nums">
                          {formatBDT(item.total)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* OLD BATTERY BUYBACK SECTION (EXPLICIT SEPARATE LINE) */}
              {sale.oldBatteryBuybackAmount > 0 && (
                <div className="mb-4 p-3 bg-amber-50/60 rounded border border-amber-200/80">
                  <div className="flex items-center justify-between text-amber-950 font-bold mb-1">
                    <span className="uppercase text-[11px] tracking-wider">
                      Old Battery Buyback (Customer Exchange)
                    </span>
                    <span className="font-mono tabular-nums text-rose-700 text-xs">
                      - {formatBDT(sale.oldBatteryBuybackAmount)}
                    </span>
                  </div>
                  <p className="text-[11px] text-amber-800">
                    * This is a recycled lead battery purchase credit received directly from the customer.
                    It is not a promotional sales discount.
                  </p>
                  {sale.oldBatteryBuybacks && sale.oldBatteryBuybacks.length > 0 && (
                    <div className="mt-2 text-[11px] text-slate-700 divide-y divide-amber-200/50">
                      {sale.oldBatteryBuybacks.map((obb, i) => (
                        <div key={i} className="flex justify-between py-1">
                          <span>
                            {obb.quantity}x {obb.brand} {obb.batteryType} ({obb.capacityAh}) - Condition: {obb.condition}
                          </span>
                          <span className="font-mono tabular-nums">
                            {formatBDT(obb.totalAmount)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Financial Calculation Breakdown */}
              <div className="flex justify-end pt-2 border-t border-slate-200">
                <div className="w-64 space-y-1.5 text-right">
                  <div className="flex justify-between text-slate-600">
                    <span>Gross Sale:</span>
                    <span className="font-mono tabular-nums font-medium text-slate-900">
                      {formatBDT(sale.grossSale)}
                    </span>
                  </div>

                  <div className="flex justify-between text-slate-600">
                    <span>Sales Discount:</span>
                    <span className="font-mono tabular-nums text-slate-900">
                      {formatBDT(sale.salesDiscount)}
                    </span>
                  </div>

                  {sale.oldBatteryBuybackAmount > 0 && (
                    <div className="flex justify-between font-semibold text-rose-700 bg-rose-50/60 px-1.5 py-0.5 rounded">
                      <span>Old Battery Buyback:</span>
                      <span className="font-mono tabular-nums">
                        - {formatBDT(sale.oldBatteryBuybackAmount)}
                      </span>
                    </div>
                  )}

                  <div className="flex justify-between pt-1.5 border-t border-slate-300 font-bold text-slate-900 text-sm">
                    <span>Net Payable:</span>
                    <span className="font-mono tabular-nums text-slate-950">
                      {formatBDT(sale.netPayable)}
                    </span>
                  </div>

                  <div className="flex justify-between text-slate-700">
                    <span>Paid Amount:</span>
                    <span className="font-mono tabular-nums font-semibold text-emerald-700">
                      {formatBDT(sale.paidAmount)}
                    </span>
                  </div>

                  <div className="flex justify-between text-slate-700">
                    <span>Due Balance:</span>
                    <span
                      className={`font-mono tabular-nums font-semibold ${
                        sale.dueAmount > 0 ? 'text-rose-600' : 'text-slate-500'
                      }`}
                    >
                      {formatBDT(sale.dueAmount)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Footer Terms & Signatures */}
              <div className="mt-8 pt-4 border-t border-slate-200 text-slate-500 text-[10px] space-y-2">
                <p className="italic">{settings.invoiceFooter}</p>
                <div className="flex justify-between pt-6">
                  <div className="text-center w-36 border-t border-slate-300 pt-1">
                    Customer Signature
                  </div>
                  <div className="text-center w-36 border-t border-slate-300 pt-1">
                    Authorized Signatory
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* ================= COMPACT 80MM POS THERMAL RECEIPT ================= */
            <div className="w-80 bg-white p-4 border border-slate-300 font-mono text-[11px] leading-tight text-slate-900 shadow-xs">
              <div className="text-center border-b border-dashed border-slate-400 pb-3 mb-3">
                <p className="font-bold text-sm tracking-wide">{settings.shopName}</p>
                <p className="text-[10px] text-slate-600 mt-0.5">{settings.address}</p>
                <p className="text-[10px] text-slate-600">Tel: {settings.phone}</p>
                <p className="font-bold mt-1 text-xs">*** SALES RECEIPT ***</p>
              </div>

              <div className="mb-2 space-y-0.5 text-[10px]">
                <div className="flex justify-between">
                  <span>INV: {sale.invoiceNo}</span>
                  <span>{formatDateTime(sale.date).split(',')[0]}</span>
                </div>
                <div>Customer: {sale.customerName}</div>
                <div>Cashier: {sale.createdBy}</div>
              </div>

              <div className="border-t border-b border-dashed border-slate-400 py-1.5 my-2">
                <div className="flex justify-between font-bold mb-1">
                  <span>ITEM</span>
                  <span>QTY x RATE = AMT</span>
                </div>
                {sale.items.map((it, idx) => (
                  <div key={idx} className="mb-1">
                    <div className="font-semibold">{it.productName}</div>
                    <div className="flex justify-between text-slate-600">
                      <span>
                        {it.quantity} {it.unit} @ {formatBDT(it.unitPrice)}
                      </span>
                      <span className="font-mono tabular-nums text-slate-900 font-bold">
                        {formatBDT(it.total)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Explicit Old Battery Buyback */}
              {sale.oldBatteryBuybackAmount > 0 && (
                <div className="border-b border-dashed border-slate-400 pb-2 mb-2 text-rose-700">
                  <div className="flex justify-between font-bold">
                    <span>OLD BATTERY BUYBACK:</span>
                    <span>-{formatBDT(sale.oldBatteryBuybackAmount)}</span>
                  </div>
                  {sale.oldBatteryBuybacks?.map((b, i) => (
                    <div key={i} className="text-[10px] text-slate-600">
                      {b.quantity}x {b.brand} {b.capacityAh} ({b.condition})
                    </div>
                  ))}
                </div>
              )}

              {/* Totals */}
              <div className="space-y-1 text-right mb-3">
                <div className="flex justify-between">
                  <span>Gross Sale:</span>
                  <span>{formatBDT(sale.grossSale)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Discount:</span>
                  <span>{formatBDT(sale.salesDiscount)}</span>
                </div>
                {sale.oldBatteryBuybackAmount > 0 && (
                  <div className="flex justify-between font-bold text-rose-700">
                    <span>Old Battery Buyback:</span>
                    <span>-{formatBDT(sale.oldBatteryBuybackAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-xs border-t border-dashed border-slate-400 pt-1">
                  <span>NET PAYABLE:</span>
                  <span>{formatBDT(sale.netPayable)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Paid ({sale.paymentMethod}):</span>
                  <span>{formatBDT(sale.paidAmount)}</span>
                </div>
                <div className="flex justify-between font-bold">
                  <span>Due Balance:</span>
                  <span>{formatBDT(sale.dueAmount)}</span>
                </div>
              </div>

              <div className="text-center text-[10px] text-slate-500 border-t border-dashed border-slate-400 pt-2">
                <p>Thank you for your purchase!</p>
                <p className="mt-0.5">VoltPulse Electronics</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
