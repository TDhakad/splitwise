import clsx from 'clsx';
import { avatarColor, initials } from '../../lib/utils';
import type { ExpenseWithCreator, User } from '../../types/api';
import type { StringById } from '../../types/ui';

export type EditSplitMethod = 'Equally' | 'Unequally' | 'Shares';

interface SplitEditorProps {
  expense: ExpenseWithCreator;
  users: User[];
  splitMethod: EditSplitMethod;
  splits: StringById;
  totalAccounted: number;
  parsedAmount: number;
  isPerfectSplit: boolean;
  onSplitMethodChange: (method: EditSplitMethod) => void;
  onSplitChange: (userId: number, value: string) => void;
}

export default function SplitEditor({
  expense,
  users,
  splitMethod,
  splits,
  totalAccounted,
  parsedAmount,
  isPerfectSplit,
  onSplitMethodChange,
  onSplitChange,
}: SplitEditorProps) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <h3 className="font-bold text-gray-900 text-lg">Split Method</h3>
        <div className="flex bg-gray-100 rounded-lg p-1">
          {(['Equally', 'Unequally', 'Shares'] as EditSplitMethod[]).map(m => (
            <button
              key={m}
              onClick={() => onSplitMethodChange(m)}
              className={clsx(
                "px-4 py-1.5 text-sm font-medium rounded-md transition-colors",
                splitMethod === m ? "bg-white text-[#007A64] shadow-sm" : "text-gray-600 hover:text-gray-900"
              )}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-4 mb-8">
        {expense.participants?.map(p => {
          const user = users.find(u => u.id === p.user_id);
          return (
            <div key={p.user_id} className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={clsx("w-10 h-10 rounded-full flex items-center justify-center font-bold text-white shadow-sm", avatarColor(p.user_id))}>
                  {initials(user?.name || 'U')}
                </div>
                <span className="font-medium text-gray-900">{user?.name}</span>
              </div>
              <div className="flex items-center gap-1 text-gray-900 font-medium">
                {splitMethod !== 'Shares' && <span className="text-gray-400 mr-0.5">$</span>}
                <input
                  type="number"
                  className="w-20 text-right outline-none bg-transparent disabled:opacity-60 font-bold"
                  value={splits?.[p.user_id] || ''}
                  disabled={splitMethod === 'Equally'}
                  onChange={(e) => onSplitChange(p.user_id, e.target.value)}
                />
                {splitMethod === 'Shares' && <span className="text-gray-400 ml-0.5">%</span>}
              </div>
            </div>
          );
        })}
      </div>

      <div className="pt-4 border-t border-gray-200">
        <div className="flex justify-between items-end mb-2">
          <span className="text-sm font-medium text-gray-500">Total Accounted For</span>
          <span className={clsx("font-bold text-lg", isPerfectSplit ? "text-[#007A64]" : "text-red-500")}>
            {splitMethod === 'Shares'
              ? `${totalAccounted.toFixed(1)}% / 100.0%`
              : `$${totalAccounted.toFixed(2)} / $${parsedAmount.toFixed(2)}`
            }
          </span>
        </div>
        <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
          <div
            className={clsx("h-full rounded-full transition-all", isPerfectSplit ? "bg-[#007A64]" : "bg-red-500")}
            style={{
              width: `${Math.min(
                splitMethod === 'Shares'
                  ? totalAccounted
                  : (totalAccounted / (parsedAmount || 1)) * 100,
                100
              )}%`
            }}
          />
        </div>
      </div>
    </div>
  );
}
