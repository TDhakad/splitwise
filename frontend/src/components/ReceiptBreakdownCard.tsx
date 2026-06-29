import { useEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import MSIcon from './MSIcon';
import { avatarColor, initials } from '../lib/utils';
import { exportReceiptBreakdown, copyReceiptBreakdown, type ReceiptExportFormat } from '../lib/receiptExport';
import type { ReceiptBreakdown, User } from '../types/api';

interface ReceiptBreakdownCardProps {
  breakdown: ReceiptBreakdown;
  users: User[];
  currentUserId: number;
  title?: string;
  onEdit?: () => void;
}

const formatMoney = (value: number) => `$${value.toFixed(2)}`;

export default function ReceiptBreakdownCard({ breakdown, users, currentUserId, title, onEdit }: ReceiptBreakdownCardProps) {
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const [copied, setCopied] = useState<ReceiptExportFormat | null>(null);
  const exportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!exportMenuOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (exportRef.current && !exportRef.current.contains(event.target as Node)) {
        setExportMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [exportMenuOpen]);

  const handleExport = (format: ReceiptExportFormat) => {
    exportReceiptBreakdown(breakdown, users, format, title);
    setExportMenuOpen(false);
  };

  const handleCopy = async (format: ReceiptExportFormat) => {
    try {
      await copyReceiptBreakdown(breakdown, users, format);
      setCopied(format);
      window.setTimeout(() => setCopied(null), 1500);
    } catch {
      setCopied(null);
    }
    setExportMenuOpen(false);
  };

  const findUser = (userId: number) => users.find(user => user.id === userId);
  const labelForUser = (userId: number) => {
    const user = findUser(userId);
    if (userId === currentUserId) return 'You';
    return user?.name ?? 'Unknown';
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between gap-4">
        <div>
          <h3 className="text-xs font-bold tracking-widest uppercase text-gray-500">Receipt Breakdown</h3>
          <p className="text-sm text-gray-500 mt-1">Tax, tip, and discount split proportionally by item subtotal.</p>
        </div>
        <div className="shrink-0 flex items-center gap-2">
          <div className="relative" ref={exportRef}>
            <button
              onClick={() => setExportMenuOpen(open => !open)}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-[#007A64] rounded-lg text-sm font-bold hover:bg-[#EAF5F2] transition-colors"
              aria-haspopup="menu"
              aria-expanded={exportMenuOpen}
            >
              <MSIcon name={copied ? 'check' : 'download'} className="text-base" />
              {copied ? `Copied ${copied.toUpperCase()}` : 'Export'}
            </button>
            {exportMenuOpen && (
              <div
                role="menu"
                className="absolute right-0 mt-2 w-40 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-10"
              >
                <button
                  role="menuitem"
                  onClick={() => handleExport('csv')}
                  className="w-full text-left px-4 py-2 text-sm font-medium text-gray-700 hover:bg-[#EAF5F2] hover:text-[#007A64] transition-colors"
                >
                  Export as CSV
                </button>
                <button
                  role="menuitem"
                  onClick={() => handleExport('tsv')}
                  className="w-full text-left px-4 py-2 text-sm font-medium text-gray-700 hover:bg-[#EAF5F2] hover:text-[#007A64] transition-colors"
                >
                  Export as TSV
                </button>
                <div className="my-1 border-t border-gray-100" />
                <button
                  role="menuitem"
                  onClick={() => handleCopy('csv')}
                  className="w-full text-left px-4 py-2 text-sm font-medium text-gray-700 hover:bg-[#EAF5F2] hover:text-[#007A64] transition-colors"
                >
                  Copy as CSV
                </button>
                <button
                  role="menuitem"
                  onClick={() => handleCopy('tsv')}
                  className="w-full text-left px-4 py-2 text-sm font-medium text-gray-700 hover:bg-[#EAF5F2] hover:text-[#007A64] transition-colors"
                >
                  Copy as TSV
                </button>
              </div>
            )}
          </div>
          {onEdit && (
            <button
              onClick={onEdit}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-[#007A64] rounded-lg text-sm font-bold hover:bg-[#EAF5F2] transition-colors"
            >
              <MSIcon name="edit" className="text-base" />
              Edit Split
            </button>
          )}
        </div>
      </div>

      <div className="divide-y divide-gray-100">
        {breakdown.items.map((item, index) => {
          const badge = item.split_type === 'individual' ? 'Individual' : item.split_type === 'custom' ? 'Custom' : `Shared (${item.shares.length})`;
          return (
            <div key={`${item.name}-${index}`} className="p-5">
              <div className="flex items-start justify-between gap-4 mb-3">
                <div>
                  <p className="font-bold text-gray-900">{item.name}</p>
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    <span className={clsx(
                      'text-[10px] font-bold tracking-wider uppercase px-2 py-1 rounded-md',
                      item.split_type === 'individual' ? 'bg-[#EAF5F2] text-[#007A64]' : 'bg-gray-100 text-gray-600'
                    )}>
                      {badge}
                    </span>
                    <div className="flex -space-x-2">
                      {item.shares.slice(0, 4).map(share => {
                        const user = findUser(share.user_id);
                        return (
                          <span
                            key={share.user_id}
                            className={clsx('w-6 h-6 rounded-full border-2 border-white flex items-center justify-center text-[10px] font-bold text-white', avatarColor(share.user_id))}
                            title={labelForUser(share.user_id)}
                          >
                            {initials(user?.name ?? 'U')}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                </div>
                <p className="font-bold text-gray-900">{formatMoney(item.price)}</p>
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-600">
                {item.shares.map(share => (
                  <span key={share.user_id}>
                    <span className="font-medium text-gray-900">{labelForUser(share.user_id)}</span> {formatMoney(share.amount)}
                  </span>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <div className="border-t border-gray-100 bg-gray-50/60 p-5">
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
          <TotalCell label="Subtotal" value={breakdown.totals.subtotal} />
          <TotalCell label="Discount" value={-breakdown.totals.discount} />
          <TotalCell label="Tax" value={breakdown.totals.tax} />
          <TotalCell label="Tip" value={breakdown.totals.tip} />
          <TotalCell label="Total" value={breakdown.totals.total} strong />
        </div>
      </div>
    </div>
  );
}

interface TotalCellProps {
  label: string;
  value: number;
  strong?: boolean;
}

function TotalCell({ label, value, strong = false }: TotalCellProps) {
  return (
    <div>
      <p className="text-[11px] font-bold tracking-widest uppercase text-gray-500 mb-1">{label}</p>
      <p className={clsx('font-bold tabular-nums', strong ? 'text-[#007A64] text-lg' : 'text-gray-900')}>
        {formatMoney(value)}
      </p>
    </div>
  );
}
