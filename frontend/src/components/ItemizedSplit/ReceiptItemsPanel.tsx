import clsx from 'clsx';
import MSIcon from '../MSIcon';
import { avatarColor, initials } from '../../lib/utils';
import { getSplitText } from './itemizedSplitUtils';
import type { User } from '../../types/api';
import type { NumberById, ReceiptLineItem } from '../../types/ui';

interface ReceiptItemsPanelProps {
  items: ReceiptLineItem[];
  activeUsers: User[];
  currentUserId: number;
  itemAssignments: number[][];
  customSplits: Array<NumberById | null>;
  onSetAllForMe: () => void;
  onToggleUser: (itemIndex: number, userId: number) => void;
  onEditItem: (itemIndex: number) => void;
  onUpdateItemPrice: (itemIndex: number, price: string) => void;
  onAddMember: () => void;
}

export default function ReceiptItemsPanel({
  items,
  activeUsers,
  currentUserId,
  itemAssignments,
  customSplits,
  onSetAllForMe,
  onToggleUser,
  onEditItem,
  onUpdateItemPrice,
  onAddMember,
}: ReceiptItemsPanelProps) {
  return (
    <div className="flex-1 w-full bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
      <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-white sticky top-0 z-10">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Receipt Items</h2>
          <p className="text-sm text-gray-500 mt-1">Tap avatars to assign items.</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={onAddMember}
            className="flex items-center gap-1.5 text-sm font-semibold text-[#007A64] border border-[#007A64]/30 bg-[#EAF5F2] hover:bg-[#007A64] hover:text-white rounded-full px-3 py-1.5 transition-all"
          >
            <MSIcon name="person_add" style={{ fontSize: 16 }} />
            Add Member
          </button>
          <button onClick={onSetAllForMe} className="text-sm font-semibold text-[#007A64] hover:text-[#006150] transition-colors">
            Select All for Me
          </button>
        </div>
      </div>

      <div className="divide-y divide-gray-100">
        {items.map((item, idx) => {
          const splitInfo = getSplitText(item, itemAssignments[idx], customSplits[idx], activeUsers, currentUserId);
          return (
            <div key={idx} className="p-6 hover:bg-gray-50/50 transition-colors group">
              <div className="flex justify-between items-start mb-4">
                <div className="font-medium text-gray-900">{item.name}</div>
                <div className="flex items-center justify-end">
                  <span className="text-gray-500 font-medium">$</span>
                  <input
                    type="number"
                    value={item.price}
                    onChange={(e) => onUpdateItemPrice(idx, e.target.value)}
                    className="w-20 font-medium text-gray-900 border-none p-0 text-right focus:ring-0 bg-transparent"
                    min="0"
                    step="0.01"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 mb-4">
                {activeUsers.map(u => {
                  const isAssigned = itemAssignments[idx].includes(u.id);
                  return (
                    <button
                      key={u.id}
                      onClick={() => onToggleUser(idx, u.id)}
                      className={clsx(
                        "w-10 h-10 rounded-full flex items-center justify-center font-bold text-white text-sm transition-all relative overflow-hidden",
                        isAssigned
                          ? "ring-2 ring-offset-2 ring-[#007A64] shadow-sm"
                          : "opacity-40 grayscale hover:grayscale-0 hover:opacity-100",
                        avatarColor(u.id)
                      )}
                    >
                      {initials(u.name)}
                    </button>
                  );
                })}
              </div>

              <button
                onClick={() => onEditItem(idx)}
                className={clsx(
                  "w-full text-left rounded-xl px-4 py-2.5 text-sm flex items-center gap-2 transition-colors",
                  splitInfo.alert
                    ? "bg-red-50 text-red-600 hover:bg-red-100 border border-red-200"
                    : "bg-white border border-gray-200 text-gray-700 hover:border-[#007A64] hover:text-[#007A64] hover:bg-[#EAF5F2]"
                )}
              >
                {splitInfo.alert
                  ? <MSIcon name="error_outline" style={{ fontSize: 16 }} />
                  : <MSIcon name="edit" style={{ fontSize: 15 }} />
                }
                <span className="flex-1">
                  {splitInfo.alert ? splitInfo.text : `Edit split · ${splitInfo.text}`}
                </span>
                {!splitInfo.alert && <MSIcon name="chevron_right" style={{ fontSize: 18 }} className="text-gray-400" />}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
