import React, { useState, useEffect } from 'react';
import { auditService } from '../services/auditService';
import { AuditLog, AuditAction } from '../types';
import { formatDateTime } from '../utils/formatters';
import { StatusBadge } from '../components/StatusBadge';
import { ShieldCheck, Search, Filter } from 'lucide-react';

export const AuditLogsPage: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState<AuditAction | 'ALL'>('ALL');

  useEffect(() => {
    setLoading(true);
    const unsub = auditService.subscribeAuditLogs((data) => {
      setLogs(data);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const filtered = logs.filter((log) => {
    const matchesSearch =
      log.description.toLowerCase().includes(search.toLowerCase()) ||
      log.recordId.toLowerCase().includes(search.toLowerCase()) ||
      log.userName.toLowerCase().includes(search.toLowerCase());
    const matchesAction = actionFilter === 'ALL' || log.action === actionFilter;
    return matchesSearch && matchesAction;
  });

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-slate-900 tracking-tight">System Security & Audit Trail</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Immutable forensic log of all user financial actions, transactions, voids and adjustments
        </p>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-3.5 rounded-lg border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search audit descriptions, invoice IDs, or staff names..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full text-xs pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded focus:bg-white focus:outline-hidden"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value as any)}
            className="text-xs p-1.5 bg-slate-50 border border-slate-300 rounded font-medium text-slate-700"
          >
            <option value="ALL">All Actions</option>
            <option value="CREATE">CREATE</option>
            <option value="VOID">VOID</option>
            <option value="CANCEL">CANCEL</option>
            <option value="PAYMENT">PAYMENT</option>
            <option value="STOCK_ADJUSTMENT">STOCK ADJUSTMENT</option>
          </select>
        </div>
      </div>

      {/* Audit Table */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-3">User & Role</th>
                <th className="py-3 px-3 text-center">Action</th>
                <th className="py-3 px-3">Module</th>
                <th className="py-3 px-3 font-mono">Record ID</th>
                <th className="py-3 px-3">Description</th>
                <th className="py-3 px-3 font-mono">Terminal IP</th>
                <th className="py-3 px-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                  <td className="py-3 px-4 text-slate-600 whitespace-nowrap font-mono text-[11px]">
                    {formatDateTime(log.timestamp)}
                  </td>
                  <td className="py-3 px-3 font-medium text-slate-900">
                    <div>{log.userName}</div>
                    <span className="text-[10px] text-slate-400 font-mono">[{log.userRole}]</span>
                  </td>
                  <td className="py-3 px-3 text-center">
                    <span
                      className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-mono font-bold ${
                        log.action === 'VOID' || log.action === 'CANCEL'
                          ? 'bg-rose-100 text-rose-700'
                          : log.action === 'CREATE'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {log.action}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-slate-700 font-medium">{log.module}</td>
                  <td className="py-3 px-3 font-mono text-[11px] text-slate-600">{log.recordId}</td>
                  <td className="py-3 px-3 text-slate-600 max-w-md">{log.description}</td>
                  <td className="py-3 px-3 font-mono text-[10px] text-slate-400">{log.ipAddress}</td>
                  <td className="py-3 px-4 text-center">
                    <StatusBadge status={log.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
