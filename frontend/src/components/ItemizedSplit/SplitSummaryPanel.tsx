import clsx from 'clsx';
import MSIcon from '../MSIcon';
import { avatarColor, initials } from '../../lib/utils';
import type { ReceiptReviewData } from '../../types/ui';
import type { User } from '../../types/api';
import { toNumber, type MemberTotal } from './itemizedSplitUtils';

interface SplitSummaryPanelProps {
  activeUsers: User[];
  currentUserId: number;
  receiptTotal: number;
  receiptData: ReceiptReviewData;
  assignedSum: number;
  unassigned: number;
  memberTotals: Record<number, MemberTotal>;
  isFullyAssigned: boolean;
  onFinish: () => void;
}

export default function SplitSummaryPanel({
  activeUsers,
  currentUserId,
  receiptTotal,
  receiptData,
  assignedSum,
  unassigned,
  memberTotals,
  isFullyAssigned,
  onFinish,
}: SplitSummaryPanelProps) {
  const subtotal = toNumber(receiptData.subtotal);
  const discount = toNumber(receiptData.discount);
  const tax = toNumber(receiptData.tax);
  const tip = toNumber(receiptData.tip);

  return (
    <div className="w-full bg-white border border-gray-200 rounded-2xl shadow-sm p-6">
      <h3 className="text-[11px] font-bold text-gray-500 tracking-wider uppercase mb-4">Current Split Summary</h3>

      <div className="mb-6">
        <div className="text-sm text-gray-500 mb-1">Total Bill (inc. Tax/Tip)</div>
        <div className="text-4xl font-bold text-gray-900 mb-4">${receiptTotal.toFixed(2)}</div>

        <div className="h-2 bg-gray-100 rounded-full overflow-hidden flex mb-2">
          <div
            className="h-full bg-[#00D69D] transition-all"
            style={{ width: `${receiptTotal > 0 ? Math.min(100, (assignedSum / receiptTotal) * 100) : 0}%` }}
          />
          {unassigned > 0.01 && (
            <div
              className="h-full bg-red-100 transition-all"
              style={{ width: `${receiptTotal > 0 ? (unassigned / receiptTotal) * 100 : 0}%` }}
            />
          )}
        </div>

        <div className="flex justify-between text-xs font-medium">
          <span className="text-gray-600">Assigned: ${assignedSum.toFixed(2)}</span>
          {unassigned > 0.01 && <span className="text-red-500">Unassigned: ${unassigned.toFixed(2)}</span>}
          {unassigned < -0.01 && <span className="text-red-500">Overassigned: ${Math.abs(unassigned).toFixed(2)}</span>}
        </div>
      </div>

      <div className="border-t border-gray-100 pt-5 mb-6">
        <h3 className="text-[11px] font-bold text-gray-500 tracking-wider uppercase mb-3">Receipt Totals</h3>
        <div className="space-y-2 text-sm">
          <SummaryRow label="Subtotal" value={subtotal} />
          {discount > 0 && <SummaryRow label="Discount" value={-discount} />}
          <SummaryRow label="Tax" value={tax} />
          <SummaryRow label="Tip" value={tip} />
          <div className="border-t border-gray-100 pt-2 mt-2">
            <SummaryRow label="Total" value={receiptTotal} strong />
          </div>
        </div>
        <p className="text-xs text-gray-500 mt-3 leading-relaxed">
          Tax, tip, and discount are split proportionally by each person&apos;s item subtotal.
        </p>
      </div>

      <div className="border-t border-gray-100 pt-6 mb-8">
        <h3 className="text-[11px] font-bold text-gray-500 tracking-wider uppercase mb-4">Member Totals</h3>
        <div className="space-y-4">
          {activeUsers.map(u => (
            <div key={u.id} className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={clsx("w-8 h-8 rounded-full flex items-center justify-center font-bold text-white text-xs", avatarColor(u.id))}>
                  {initials(u.name)}
                </div>
                <span className="font-medium text-gray-900">{u.id === currentUserId ? 'You' : u.name}</span>
              </div>
              <span className="font-bold text-gray-900">${memberTotals[u.id].total.toFixed(2)}</span>
            </div>
          ))}
        </div>
      </div>

      <button
        onClick={onFinish}
        disabled={!isFullyAssigned}
        className={clsx(
          "w-full font-bold py-3.5 rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 text-base",
          isFullyAssigned ? "bg-[#007A64] hover:bg-[#006150] text-white" : "bg-gray-100 text-gray-400 cursor-not-allowed"
        )}
      >
        Finish Split <MSIcon name="arrow_forward" />
      </button>

      {!isFullyAssigned && (
        <p className="text-center text-xs text-red-500 mt-3 font-medium">
          Assign all items to finish.
        </p>
      )}
    </div>
  );
}

interface SummaryRowProps {
  label: string;
  value: number;
  strong?: boolean;
}

function SummaryRow({ label, value, strong = false }: SummaryRowProps) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className={strong ? 'font-bold text-gray-900' : 'text-gray-600'}>{label}</span>
      <span className={clsx('tabular-nums', strong ? 'font-bold text-gray-900' : 'font-semibold text-gray-700')}>
        ${value.toFixed(2)}
      </span>
    </div>
  );
}
