import clsx from 'clsx';
import MSIcon from '../MSIcon';
import { avatarColor, initials } from '../../lib/utils';
import { getSplitText, toNumber } from './itemizedSplitUtils';
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
}: ReceiptItemsPanelProps) {
  return (
    <div className="flex-1 w-full bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
      <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-white sticky top-0 z-10">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Receipt Items</h2>
          <p className="text-sm text-gray-500 mt-1">Tap avatars to assign items.</p>
        </div>
        <button onClick={onSetAllForMe} className="text-sm font-semibold text-[#007A64] hover:text-[#006150] transition-colors">
          Select All for Me
        </button>
      </div>

      <div className="divide-y divide-gray-100">
        {items.map((item, idx) => {
          const splitInfo = getSplitText(item, itemAssignments[idx], customSplits[idx], activeUsers, currentUserId);
          return (
            <div key={idx} className="p-6 hover:bg-gray-50/50 transition-colors group">
              <div className="flex justify-between items-start mb-4">
                <div className="font-medium text-gray-900">{item.name}</div>
                <div className="font-medium text-gray-900">${toNumber(item.price).toFixed(2)}</div>
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
                    ? "bg-red-50 text-red-600 hover:bg-red-100"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                )}
              >
                {splitInfo.alert ? <MSIcon name="error_outline" style={{fontSize: 16}} /> : <MSIcon name="call_split" style={{fontSize: 16}} />}
                {splitInfo.text}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
