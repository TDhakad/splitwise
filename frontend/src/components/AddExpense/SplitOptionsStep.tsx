import clsx from 'clsx';
import MSIcon from '../MSIcon';
import { avatarColor, initials } from '../../lib/utils';
import type { Dispatch, SetStateAction } from 'react';
import type { User } from '../../types/api';
import type { NumberById, SplitMethod, StringById } from '../../types/ui';

interface SplitOptionsStepProps {
  users: User[];
  currentUserId: number;
  total: number;
  activeIds: number[];
  splitMethod: SplitMethod;
  setSplitMethod: Dispatch<SetStateAction<SplitMethod>>;
  customValues: StringById;
  setCustomValues: Dispatch<SetStateAction<StringById>>;
  preview: NumberById;
  runningSum: number;
  pctSum: number | null;
  validationMsg: string;
  onBack: () => void;
  onSave: () => void;
}

export default function SplitOptionsStep({
  users,
  currentUserId,
  total,
  activeIds,
  splitMethod,
  setSplitMethod,
  customValues,
  setCustomValues,
  preview,
  runningSum,
  pctSum,
  validationMsg,
  onBack,
  onSave,
}: SplitOptionsStepProps) {
  const tabs: SplitMethod[] = ['equal', 'unequal', 'percentage'];
  const tabLabels: Record<SplitMethod, string> = { equal: 'Equal', unequal: 'Unequal', percentage: 'Percentage' };
  const activeUsers = users.filter(u => activeIds.includes(u.id));

  return (
    <>
      <header className="sticky top-0 bg-white border-b border-gray-200 flex items-center justify-between px-5 h-16 z-10">
        <button onClick={onBack} className="p-2 -ml-2 rounded-full hover:bg-gray-100 active:scale-95 transition-all"><MSIcon name="arrow_back" className="text-[#007A64] text-xl" /></button>
        <h1 className="font-bold text-lg text-gray-900">Split options</h1>
        <button onClick={onSave} className="font-bold text-sm text-[#007A64] px-4 py-2 rounded-lg hover:bg-[#EAF5F2] active:scale-95 transition-all">Save</button>
      </header>
      <div className="overflow-y-auto flex-1 no-scrollbar pb-32">
        <section className="text-center px-6 py-8 bg-gray-50 border-b border-gray-200">
          <p className="text-xs font-bold tracking-widest uppercase text-gray-500 mb-2">Total Amount</p>
          <h2 className="text-5xl font-bold text-[#007A64]" style={{ fontVariantNumeric: 'tabular-nums' }}>${total > 0 ? total.toFixed(2) : '0.00'}</h2>
        </section>
        <section className="px-6 py-6">
          <div className="bg-gray-100 p-1.5 rounded-xl flex items-center h-12 border border-gray-200 mb-6">
            {tabs.map(key => (
              <button
                key={key}
                onClick={() => { setSplitMethod(key); setCustomValues({}); }}
                className={clsx('flex-1 h-full rounded-lg text-xs font-bold transition-all uppercase tracking-wide', splitMethod === key ? 'bg-white text-[#007A64] shadow-sm' : 'text-gray-500 hover:text-gray-900')}
              >
                {tabLabels[key]}
              </button>
            ))}
          </div>

          {splitMethod !== 'equal' && total > 0 && (
            <div className={clsx("rounded-xl px-5 py-4 flex items-center justify-between mb-6 border", validationMsg ? "bg-red-50 border-red-200" : "bg-gray-50 border-gray-200")}>
              <div className="flex items-center gap-3">
                <MSIcon name="info" className={clsx("text-lg", validationMsg ? "text-red-500" : "text-gray-500")} />
                <span className={clsx("text-sm font-medium", validationMsg ? "text-red-600" : "text-gray-700")}>
                  {splitMethod === 'percentage' ? `${pctSum?.toFixed(1) ?? 0}% of 100%` : `Remaining: $${(total - runningSum).toFixed(2)}`}
                </span>
              </div>
              <span className={clsx("text-xs font-bold tracking-widest uppercase", validationMsg ? "text-red-600" : "text-[#007A64]")}>
                {validationMsg ? 'ERROR' : Math.abs(runningSum - total) < 0.01 && runningSum > 0 ? 'READY' : 'PENDING'}
              </span>
            </div>
          )}

          <div className="space-y-3">
            {activeUsers.map(u => {
              const isMe = u.id === currentUserId;
              const share = preview[u.id] ?? 0;
              return (
                <div key={u.id} className="bg-white border border-gray-200 rounded-xl px-5 py-4 flex items-center justify-between shadow-sm">
                  <div className="flex items-center gap-4">
                    <div className={clsx('w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shadow-sm', avatarColor(u.id))}>{initials(u.name)}</div>
                    <div>
                      <p className="font-bold text-sm text-gray-900">{isMe ? 'You' : u.name}</p>
                      <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wide mt-0.5">{isMe ? `Paid $${total.toFixed(2)}` : 'Lent $0.00'}</p>
                    </div>
                  </div>
                  {splitMethod === 'equal' && <span className="text-[15px] font-bold text-[#007A64]">${share.toFixed(2)}</span>}
                  {splitMethod === 'unequal' && (
                    <div className="relative w-32">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-sm">$</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                        value={customValues[u.id] || ''}
                        onChange={e => setCustomValues(prev => ({ ...prev, [u.id]: e.target.value }))}
                        className="w-full bg-gray-50 border border-gray-200 rounded-lg pl-8 pr-3 py-2 text-right font-bold text-[#007A64] focus:ring-2 focus:ring-[#007A64] focus:bg-white transition-all outline-none text-sm"
                      />
                    </div>
                  )}
                  {splitMethod === 'percentage' && (
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="1"
                        placeholder="0"
                        value={customValues[u.id] || ''}
                        onChange={e => setCustomValues(prev => ({ ...prev, [u.id]: e.target.value }))}
                        className="w-16 bg-transparent border-b-2 border-gray-300 focus:border-[#007A64] py-1 text-right font-bold text-gray-900 outline-none transition-colors text-xl"
                        style={{ fontVariantNumeric: 'tabular-nums' }}
                      />
                      <span className="text-lg text-gray-400 font-bold">%</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {splitMethod === 'percentage' && total > 0 && (
            <div className="mt-8">
              <div className="flex items-center justify-between mb-2">
                <div className={clsx("flex items-center gap-1.5 text-sm font-bold", validationMsg ? "text-red-600" : "text-[#007A64]")}>
                  {validationMsg && <MSIcon name="error" className="text-base" />}
                  Total: {pctSum?.toFixed(0) ?? 0}%
                </div>
                <span className="text-xs font-bold tracking-wide uppercase text-gray-500">{Math.max(0, 100 - (pctSum ?? 0)).toFixed(0)}% remaining</span>
              </div>
              <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                <div className={clsx("h-full rounded-full transition-all", validationMsg ? "bg-red-500" : "bg-[#007A64]")} style={{ width: `${Math.min(pctSum ?? 0, 100)}%` }} />
              </div>
            </div>
          )}
        </section>
      </div>
      <div className="absolute bottom-0 left-0 w-full bg-white/90 backdrop-blur-md p-5 border-t border-gray-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
        <button
          onClick={onSave}
          disabled={splitMethod !== 'equal' && !!validationMsg}
          className={clsx("w-full h-14 font-bold text-lg rounded-xl transition-all shadow-md flex items-center justify-center gap-2 active:scale-[0.98]",
            (splitMethod === 'equal' || !validationMsg) ? "bg-[#007A64] hover:bg-[#00604f] text-white" : "bg-gray-100 text-gray-400 cursor-not-allowed shadow-none")}
        >
          Apply Split
        </button>
      </div>
    </>
  );
}
