import React, { useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmationModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  warningNote?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  requireReason?: boolean;
  reasonPlaceholder?: string;
  isDestructive?: boolean;
  onConfirm: (reason?: string) => void;
  onClose: () => void;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  title,
  message,
  warningNote,
  confirmLabel = 'Confirm Action',
  cancelLabel = 'Dismiss',
  requireReason = false,
  reasonPlaceholder = 'Please enter reason...',
  isDestructive = true,
  onConfirm,
  onClose,
}) => {
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (requireReason && !reason.trim()) {
      setError('A mandatory reason is required for financial safety audit.');
      return;
    }
    setError('');
    onConfirm(reason);
    setReason('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
      <div className="bg-white rounded-lg border border-slate-200 shadow-xl max-w-md w-full p-5 overflow-hidden">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`p-2 rounded-lg ${
                isDestructive ? 'bg-rose-50 text-rose-600' : 'bg-amber-50 text-amber-600'
              }`}
            >
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-900">{title}</h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-md"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-sm text-slate-600 mt-3">{message}</p>

        {warningNote && (
          <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-md text-xs text-amber-800">
            <span className="font-semibold">Financial Safety Notice: </span>
            {warningNote}
          </div>
        )}

        {requireReason && (
          <div className="mt-4">
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Audit Reason <span className="text-rose-500">*</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                if (error) setError('');
              }}
              rows={2}
              placeholder={reasonPlaceholder}
              className="w-full text-xs p-2.5 border border-slate-300 rounded-md focus:outline-hidden focus:ring-1 focus:ring-slate-900 focus:border-slate-900"
            />
            {error && <p className="text-xs text-rose-600 mt-1">{error}</p>}
          </div>
        )}

        <div className="mt-5 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-md transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className={`px-3 py-1.5 text-xs font-medium text-white rounded-md transition-colors ${
              isDestructive
                ? 'bg-rose-600 hover:bg-rose-700'
                : 'bg-slate-900 hover:bg-slate-800'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
