import { useMemo, useState } from 'react';
import clsx from 'clsx';
import MSIcon from '../MSIcon';
import { avatarColor, initials } from '../../lib/utils';
import { toNumber } from './itemizedSplitUtils';
import type { User } from '../../types/api';
import type { BooleanById, ItemSplitMethod, NumberById, ReceiptLineItem, StringById } from '../../types/ui';

interface EditItemSplitModalProps {
  item: ReceiptLineItem;
  activeUsers: User[];
  currentAssignments: number[];
  currentCustom: NumberById | null;
  onSave: (newSplit: NumberById) => void;
  onClose: () => void;
  currentUserId: number;
}

export default function EditItemSplitModal({ item, activeUsers, currentAssignments, currentCustom, onSave, onClose, currentUserId }: EditItemSplitModalProps) {
  const [splitMethod, setSplitMethod] = useState<ItemSplitMethod>(currentCustom ? 'unequal' : 'equal');
  const itemPrice = toNumber(item.price);
  const [customValues, setCustomValues] = useState<StringById>(() => {
    if (currentCustom) return Object.fromEntries(Object.entries(currentCustom).map(([key, value]) => [key, value.toFixed(2)])) as StringById;
    const cv: StringById = {};
    activeUsers.forEach(u => cv[u.id] = currentAssignments.includes(u.id) ? (itemPrice / currentAssignments.length).toFixed(2) : '');
    return cv;
  });
  const [shares, setShares] = useState<StringById>(() => {
    const s: StringById = {};
    activeUsers.forEach(u => s[u.id] = currentAssignments.includes(u.id) ? '1' : '');
    return s;
  });
  const [toggles, setToggles] = useState<BooleanById>(() => {
    const t: BooleanById = {};
    activeUsers.forEach(u => t[u.id] = currentAssignments.includes(u.id));
    return t;
  });

  const preview = useMemo(() => {
    const result: NumberById = {};
    if (splitMethod === 'equal') {
      const activeCount = Object.values(toggles).filter(Boolean).length;
      const eq = activeCount > 0 ? itemPrice / activeCount : 0;
      activeUsers.forEach(u => result[u.id] = toggles[u.id] ? eq : 0);
    } else if (splitMethod === 'shares') {
      const totalShares = Object.values(shares).reduce((a, b) => a + (parseFloat(b) || 0), 0);
      const perShare = totalShares > 0 ? itemPrice / totalShares : 0;
      activeUsers.forEach(u => result[u.id] = (parseFloat(shares[u.id]) || 0) * perShare);
    } else {
      activeUsers.forEach(u => result[u.id] = parseFloat(customValues[u.id]) || 0);
    }
    return result;
  }, [splitMethod, toggles, shares, customValues, itemPrice, activeUsers]);

  const sum = Object.values(preview).reduce((a, b) => a + b, 0);
  const diff = itemPrice - sum;
  const isValid = Math.abs(diff) <= 0.02;

  const handleSave = () => {
    if (!isValid) return;
    const finalSplit: NumberById = {};
    activeUsers.forEach(u => finalSplit[u.id] = preview[u.id]);
    onSave(finalSplit);
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[60]" onClick={onClose} />
      <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
          <div className="p-6 border-b border-gray-100 pb-4">
            <h3 className="font-bold text-lg text-gray-900">Edit Item Split</h3>
            <p className="text-sm text-gray-500 mb-4">{item.name}</p>

            <div className="bg-gray-100 p-1 rounded-lg flex items-center mb-2">
              {(['equal', 'unequal', 'shares'] as ItemSplitMethod[]).map(mode => (
                <button
                  key={mode}
                  onClick={() => setSplitMethod(mode)}
                  className={clsx(
                    "flex-1 text-sm font-bold py-1.5 rounded-md transition-all capitalize",
                    splitMethod === mode ? "bg-white text-[#007A64] shadow-sm" : "text-gray-500 hover:text-gray-700"
                  )}
                >
                  {mode === 'equal' ? 'Equally' : mode === 'unequal' ? 'Unequally' : 'Shares'}
                </button>
              ))}
            </div>
          </div>

          <div className="p-6 space-y-4 max-h-[50vh] overflow-y-auto">
            {activeUsers.map(u => (
              <div key={u.id} className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className={clsx("w-8 h-8 rounded-full flex items-center justify-center font-bold text-white text-xs", avatarColor(u.id))}>
                    {initials(u.name)}
                  </div>
                  <span className="font-medium text-gray-900">{u.id === currentUserId ? 'You' : u.name.split(' ')[0]}</span>
                </div>

                {splitMethod === 'equal' && (
                  <div className="flex items-center gap-3">
                    <span className="text-gray-500 text-sm font-medium">${preview[u.id].toFixed(2)}</span>
                    <button
                      onClick={() => setToggles({...toggles, [u.id]: !toggles[u.id]})}
                      className={clsx("w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors shrink-0", toggles[u.id] ? "bg-[#007A64] border-[#007A64]" : "border-gray-300")}
                    >
                      {toggles[u.id] && <MSIcon name="check" style={{fontSize: 14, color: 'white'}} />}
                    </button>
                  </div>
                )}

                {splitMethod === 'shares' && (
                  <div className="flex items-center gap-3">
                    <span className="text-gray-500 text-sm font-medium w-16 text-right">${preview[u.id].toFixed(2)}</span>
                    <input
                      type="number"
                      value={shares[u.id] || ''}
                      onChange={e => setShares({ ...shares, [u.id]: e.target.value })}
                      className="w-16 bg-gray-50 border border-gray-200 rounded-lg py-1.5 px-2 text-center font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#007A64]/20 focus:border-[#007A64]"
                      placeholder="0"
                      min="0"
                    />
                  </div>
                )}

                {splitMethod === 'unequal' && (
                  <div className="flex items-center relative w-24">
                    <span className="absolute left-3 text-gray-500">$</span>
                    <input
                      type="number"
                      value={customValues[u.id]}
                      onChange={e => setCustomValues({ ...customValues, [u.id]: e.target.value })}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl py-2 pl-6 pr-3 text-right font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#007A64]/20 focus:border-[#007A64] transition-all"
                      placeholder="0.00"
                      step="0.01"
                      min="0"
                    />
                  </div>
                )}
              </div>
            ))}

            <div className="pt-4 border-t border-gray-100 flex justify-between items-center text-sm">
              <span className="text-gray-500">Item Total: ${itemPrice.toFixed(2)}</span>
              <span className={clsx("font-bold", isValid ? "text-[#007A64]" : "text-red-500")}>
                {diff > 0.02 ? `$${diff.toFixed(2)} left` : diff < -0.02 ? `-$${Math.abs(diff).toFixed(2)} over` : '0.00 left'}
              </span>
            </div>
          </div>

          <div className="p-6 bg-gray-50 flex gap-3">
            <button onClick={onClose} className="flex-1 py-2.5 rounded-xl font-bold text-gray-600 bg-white border border-gray-200 hover:bg-gray-50 transition-colors">Cancel</button>
            <button onClick={handleSave} disabled={!isValid} className="flex-1 py-2.5 rounded-xl font-bold text-white bg-[#007A64] hover:bg-[#006150] disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors">Save Split</button>
          </div>
        </div>
      </div>
    </>
  );
}
