import React, { useState, useEffect } from 'react';
import { oldBatteryService } from '../services/oldBatteryService';
import { OldBatteryStock, OldBatteryStatus } from '../types';
import { formatBDT, formatDateTime, formatDate } from '../utils/formatters';
import { StatusBadge } from '../components/StatusBadge';
import { useToast } from '../context/ToastContext';
import {
  RotateCcw,
  Plus,
  TrendingUp,
  DollarSign,
  Layers,
  Flame,
  CheckCircle2,
  Filter,
} from 'lucide-react';

export const OldBatteriesPage: React.FC = () => {
  const { success, error } = useToast();
  const [batteries, setBatteries] = useState<OldBatteryStock[]>([]);
  const [summary, setSummary] = useState({
    inStockCount: 0,
    totalBuybackCost: 0,
    soldValueTotal: 0,
    totalProfitLoss: 0,
  });
  const [statusFilter, setStatusFilter] = useState<OldBatteryStatus | 'ALL'>('ALL');
  const [loading, setLoading] = useState(true);

  // Scrap / Sale Modal state
  const [selectedBattery, setSelectedBattery] = useState<OldBatteryStock | null>(null);
  const [scrapModalOpen, setScrapModalOpen] = useState(false);
  const [disposalValue, setDisposalValue] = useState<number>(0);
  const [disposalStatus, setDisposalStatus] = useState<OldBatteryStatus>('SCRAPPED');
  const [disposalNotes, setDisposalNotes] = useState('');

  useEffect(() => {
    setLoading(true);
    const unsub = oldBatteryService.subscribeOldBatteries(
      (list) => {
        setBatteries(list);
        setLoading(false);
        oldBatteryService.getSummary().then(setSummary).catch(() => {});
      },
      statusFilter,
      () => setLoading(false)
    );
    return () => unsub();
  }, [statusFilter]);

  const handleOpenScrapModal = (item: OldBatteryStock) => {
    setSelectedBattery(item);
    setDisposalValue(Math.round(item.buybackPrice * 1.2)); // default 20% scrap margin estimate
    setDisposalStatus('SCRAPPED');
    setDisposalNotes('Sold to licensed lead smelter / recycling center');
    setScrapModalOpen(true);
  };

  const handleConfirmDisposal = async () => {
    if (!selectedBattery) return;
    try {
      await oldBatteryService.recordSaleOrScrap(selectedBattery.id, {
        saleDisposalDate: new Date().toISOString(),
        saleDisposalValue: disposalValue,
        status: disposalStatus,
        notes: disposalNotes,
      });
      success(
        'Battery Disposal Recorded',
        `Sold for ${formatBDT(disposalValue)}. Net Profit: ${formatBDT(
          disposalValue - selectedBattery.buybackPrice
        )}`
      );
      setScrapModalOpen(false);
      setSelectedBattery(null);
    } catch {
      error('Failed to update battery status');
    }
  };

  return (
    <div className="space-y-6">
      {/* Title & Description */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Old Battery Management & Lead Recycling
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Dedicated secondary pool for buyback batteries separate from new product inventory
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-medium">Scrap Batteries In Stock</span>
            <Layers className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-xl font-bold text-slate-900 font-mono tabular-nums">
            {summary.inStockCount} <span className="text-xs font-normal text-slate-500">Units</span>
          </p>
          <span className="text-[10px] text-slate-400">Awaiting smelter lot dispatch</span>
        </div>

        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-medium">Total Buyback Capital</span>
            <DollarSign className="w-4 h-4 text-rose-600" />
          </div>
          <p className="text-xl font-bold text-rose-600 font-mono tabular-nums">
            {formatBDT(summary.totalBuybackCost)}
          </p>
          <span className="text-[10px] text-slate-400">Cost invested in scrap stock</span>
        </div>

        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-medium">Recycled Realized Value</span>
            <Flame className="w-4 h-4 text-blue-600" />
          </div>
          <p className="text-xl font-bold text-slate-900 font-mono tabular-nums">
            {formatBDT(summary.soldValueTotal)}
          </p>
          <span className="text-[10px] text-slate-400">Total sold/scrapped to date</span>
        </div>

        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-medium">Net Recycling Profit</span>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-xl font-bold text-emerald-600 font-mono tabular-nums">
            {formatBDT(summary.totalProfitLoss)}
          </p>
          <span className="text-[10px] text-slate-400">Margin earned from scrap buyers</span>
        </div>
      </div>

      {/* Filter Header */}
      <div className="bg-white p-3.5 rounded-lg border border-slate-200 shadow-xs flex items-center justify-between">
        <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">
          Old Battery Stock Registry
        </span>
        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as OldBatteryStatus | 'ALL')}
            className="text-xs p-1.5 bg-slate-50 border border-slate-300 rounded font-medium text-slate-700"
          >
            <option value="ALL">All Statuses</option>
            <option value="IN_STOCK">In Stock Only</option>
            <option value="SCRAPPED">Scrapped to Smelter</option>
            <option value="SOLD">Sold as Second-Hand</option>
          </select>
        </div>
      </div>

      {/* Old Batteries Table */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-4">Battery ID</th>
                <th className="py-3 px-3">Type & Capacity</th>
                <th className="py-3 px-3">Brand</th>
                <th className="py-3 px-3">Buyback Date</th>
                <th className="py-3 px-3">Source Customer</th>
                <th className="py-3 px-3 text-right">Buyback Cost</th>
                <th className="py-3 px-3 text-center">Status</th>
                <th className="py-3 px-3 text-right">Sale/Scrap Value</th>
                <th className="py-3 px-3 text-right">Recycling Profit</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-400">
                    Loading recycling stock...
                  </td>
                </tr>
              ) : batteries.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-400">
                    No old batteries found in this view.
                  </td>
                </tr>
              ) : (
                batteries.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">
                      {b.code}
                    </td>
                    <td className="py-3 px-3 font-medium text-slate-800">
                      {b.type} ({b.capacityAh})
                    </td>
                    <td className="py-3 px-3 text-slate-600">{b.brand}</td>
                    <td className="py-3 px-3 text-slate-500">{formatDate(b.buybackDate)}</td>
                    <td className="py-3 px-3 text-slate-700">
                      <div>{b.sourceCustomerName}</div>
                      <span className="text-[10px] text-slate-400 font-mono">
                        Inv: {b.sourceInvoiceNo}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right font-mono tabular-nums text-rose-700 font-semibold">
                      {formatBDT(b.buybackPrice)}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <StatusBadge status={b.status} />
                    </td>
                    <td className="py-3 px-3 text-right font-mono tabular-nums text-slate-700">
                      {b.saleDisposalValue ? formatBDT(b.saleDisposalValue) : '-'}
                    </td>
                    <td className="py-3 px-3 text-right font-mono tabular-nums font-semibold">
                      {b.profitLoss !== undefined ? (
                        <span className={b.profitLoss >= 0 ? 'text-emerald-700' : 'text-rose-600'}>
                          {b.profitLoss >= 0 ? '+' : ''}
                          {formatBDT(b.profitLoss)}
                        </span>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {b.status === 'IN_STOCK' ? (
                        <button
                          onClick={() => handleOpenScrapModal(b)}
                          className="px-2.5 py-1 text-xs font-semibold text-slate-900 bg-amber-400 hover:bg-amber-300 rounded transition-colors inline-flex items-center gap-1"
                        >
                          <Flame className="w-3 h-3" />
                          <span>Scrap / Sell</span>
                        </button>
                      ) : (
                        <span className="text-[11px] text-slate-400">Disposed</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Record Scrap Disposal Modal */}
      {scrapModalOpen && selectedBattery && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-lg border border-slate-200 shadow-xl max-w-md w-full p-5">
            <h3 className="text-sm font-bold text-slate-900">
              Record Smelter Scrap Sale: {selectedBattery.code}
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              {selectedBattery.brand} {selectedBattery.type} ({selectedBattery.capacityAh}) · Buyback
              cost: <span className="font-mono">{formatBDT(selectedBattery.buybackPrice)}</span>
            </p>

            <div className="space-y-3 mt-4 text-xs">
              <div>
                <label className="block text-slate-700 font-medium mb-1">Disposal Status</label>
                <select
                  value={disposalStatus}
                  onChange={(e) => setDisposalStatus(e.target.value as OldBatteryStatus)}
                  className="w-full p-2 border border-slate-300 rounded"
                >
                  <option value="SCRAPPED">Sold as Raw Scrap to Smelter</option>
                  <option value="SOLD">Sold as Second-Hand Battery</option>
                  <option value="RETURNED">Returned to Factory for Credit</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">
                  Sale Value Received (৳)
                </label>
                <input
                  type="number"
                  min="0"
                  value={disposalValue}
                  onChange={(e) => setDisposalValue(Number(e.target.value) || 0)}
                  className="w-full p-2 border border-slate-300 rounded font-mono font-bold"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">Notes / Smelter Ref</label>
                <input
                  type="text"
                  value={disposalNotes}
                  onChange={(e) => setDisposalNotes(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded"
                />
              </div>

              {/* Profit calculation */}
              <div className="p-3 bg-emerald-50 rounded border border-emerald-200 flex justify-between items-center">
                <span className="font-medium text-emerald-900">Calculated Profit:</span>
                <span className="font-mono font-bold text-emerald-700 text-sm">
                  {formatBDT(disposalValue - selectedBattery.buybackPrice)}
                </span>
              </div>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setScrapModalOpen(false)}
                className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDisposal}
                className="px-4 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded"
              >
                Confirm Sale
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
