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
    <div className="mt-8">
      <h3 className="font-bold text-gray-900 text-2xl mb-4">Split Method</h3>
      <div className="flex bg-gray-200/50 rounded-xl p-1 mb-6">
        {(['Equally', 'Unequally', 'Shares'] as EditSplitMethod[]).map(m => (
          <button
            key={m}
            onClick={() => onSplitMethodChange(m)}
            className={clsx(
              "flex-1 py-3 text-sm font-bold rounded-lg transition-all",
              splitMethod === m ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
            )}
          >
            {m}
          </button>
        ))}
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden mb-6 shadow-sm">
        {expense.participants?.map((p, index) => {
          const user = users.find(u => u.id === p.user_id);
          return (
            <div key={p.user_id} className={clsx("flex items-center justify-between p-4", index !== 0 && "border-t border-gray-100")}>
              <div className="flex items-center gap-4">
                <div className={clsx("w-10 h-10 rounded-full flex items-center justify-center font-bold text-white shadow-sm text-sm", avatarColor(p.user_id))}>
                  {initials(user?.name || 'U')}
                </div>
                <span className="font-medium text-gray-900 text-base">{user?.name}</span>
              </div>
              <div className="flex items-center gap-2 text-gray-900 font-bold border border-gray-200 rounded-xl px-4 py-2 bg-gray-50 focus-within:border-[#007A64] focus-within:bg-white transition-colors">
                {splitMethod !== 'Shares' && <span className="text-gray-400">$</span>}
                <input
                  type="number"
                  className="w-16 sm:w-20 text-right outline-none bg-transparent disabled:opacity-60 font-bold text-base"
                  value={splits?.[p.user_id] || ''}
                  disabled={splitMethod === 'Equally'}
                  onChange={(e) => onSplitChange(p.user_id, e.target.value)}
                />
                {splitMethod === 'Shares' && <span className="text-gray-400">part{parseFloat(splits?.[p.user_id] || '0') === 1 ? '' : 's'}</span>}
              </div>
            </div>
          );
        })}
      </div>

      <div className="pt-2">
        <div className="flex justify-between items-end mb-3">
          <span className="text-xs font-bold uppercase tracking-widest text-gray-500">Total Accounted For</span>
          <span className={clsx("font-bold text-sm", isPerfectSplit ? "text-[#007A64]" : "text-[#D93F3C]")}>
            {splitMethod === 'Shares'
              ? `${totalAccounted.toFixed(1)} total share${totalAccounted === 1 ? '' : 's'}`
              : `$${totalAccounted.toFixed(2)} / $${parsedAmount.toFixed(2)}`
            }
          </span>
        </div>
        <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden mb-2">
          <div
            className={clsx("h-full rounded-full transition-all", isPerfectSplit ? "bg-[#007A64]" : "bg-[#D93F3C]")}
            style={{
              width: `${Math.min(
                splitMethod === 'Shares'
                  ? (totalAccounted > 0 ? 100 : 0)
                  : (totalAccounted / (parsedAmount || 1)) * 100,
                100
              )}%`
            }}
          />
        </div>
        {!isPerfectSplit && (
          <div className="text-right text-[#D93F3C] font-bold text-xs">
            {splitMethod === 'Shares'
              ? 'Enter at least one share'
              : `$${Math.abs(totalAccounted - parsedAmount).toFixed(2)} remaining`}
          </div>
        )}
      </div>
    </div>
  );
}
