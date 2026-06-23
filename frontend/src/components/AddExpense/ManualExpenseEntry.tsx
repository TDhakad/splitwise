import clsx from 'clsx';
import CustomDropdown from '../CustomDropdown';
import MSIcon from '../MSIcon';
import { avatarColor, initials } from '../../lib/utils';
import type { User } from '../../types/api';
import type { BooleanById } from '../../types/ui';

interface ManualExpenseEntryProps {
  users: User[];
  currentUserId: number;
  involvedUsers: BooleanById;
  activeIds: number[];
  description: string;
  amount: string;
  payerId: number;
  splitLabel: string;
  onDescriptionChange: (value: string) => void;
  onAmountChange: (value: string) => void;
  onPayerChange: (value: number) => void;
  onSelectFriends: () => void;
  onSelectSplit: () => void;
}

export default function ManualExpenseEntry({
  users,
  currentUserId,
  involvedUsers,
  activeIds,
  description,
  amount,
  payerId,
  splitLabel,
  onDescriptionChange,
  onAmountChange,
  onPayerChange,
  onSelectFriends,
  onSelectSplit,
}: ManualExpenseEntryProps) {
  return (
    <div className="overflow-y-auto flex-1 no-scrollbar p-5 sm:p-6 pb-6 space-y-5 sm:space-y-6 flex flex-col">
      <section className="order-4 sm:order-1 bg-white sm:bg-transparent border border-gray-200 sm:border-0 rounded-2xl sm:rounded-none p-5 sm:p-0 shadow-sm sm:shadow-none">
        <p className="text-xs font-bold tracking-widest uppercase text-gray-500 mb-3">{involvedUsers[currentUserId] ? 'With you and:' : 'With:'}</p>
        <div className="sm:hidden flex items-center gap-4 mb-4 overflow-x-auto no-scrollbar">
          {users.slice(0, 5).map(user => {
            const selected = involvedUsers[user.id];
            return (
              <button key={user.id} onClick={onSelectFriends} className="flex flex-col items-center gap-2 min-w-14">
                <div className={clsx("w-14 h-14 rounded-full flex items-center justify-center font-bold border-2 transition-all", selected ? `${avatarColor(user.id)} text-white border-[#007A64] ring-2 ring-[#007A64]/20` : "bg-gray-200 text-gray-500 border-gray-200 opacity-70")}>
                  {initials(user.id === currentUserId ? 'You' : user.name)}
                </div>
                <span className={clsx("text-xs font-bold max-w-16 truncate", selected ? "text-gray-900" : "text-gray-400")}>{user.id === currentUserId ? 'You' : user.name}</span>
              </button>
            );
          })}
          <button onClick={onSelectFriends} className="w-14 h-14 rounded-full border-2 border-dashed border-gray-300 flex items-center justify-center text-gray-500 shrink-0" aria-label="Select friends">
            <MSIcon name="add" />
          </button>
        </div>
        <button onClick={onSelectFriends} className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3.5 px-4 flex items-center gap-3 hover:border-[#007A64] transition-colors shadow-sm">
          <MSIcon name="search" className="text-400 text-xl" />
          <span className="text-sm text-gray-600 font-medium">
            {activeIds.filter(id => id !== currentUserId).length > 0
              ? users.filter(u => involvedUsers[u.id] && u.id !== currentUserId).map(u => u.name).join(', ')
              : (involvedUsers[currentUserId] ? 'Enter names or email' : 'Select friends')}
          </span>
        </button>
      </section>

      <section className="order-2 sm:order-2 flex items-center gap-5 bg-white sm:bg-transparent border border-gray-200 sm:border-0 rounded-2xl sm:rounded-none p-4 sm:p-0 shadow-sm sm:shadow-none">
        <div className="relative">
          <button className="w-16 h-16 rounded-2xl bg-[#EAF5F2] flex items-center justify-center border border-[#007A64]/30">
            <MSIcon name="receipt_long" className="text-[#007A64] text-3xl" />
          </button>
          <div className="absolute -bottom-1 -right-1 bg-[#007A64] rounded-full w-6 h-6 flex items-center justify-center border-2 border-white">
            <MSIcon name="expand_more" className="text-white" style={{ fontSize: 14 }} />
          </div>
        </div>
        <div className="flex-1">
          <input
            type="text"
            value={description}
            onChange={e => onDescriptionChange(e.target.value)}
            placeholder="Enter a description"
            className="w-full bg-transparent border-b-0 sm:border-b-2 sm:border-gray-300 focus:border-[#007A64] py-2 text-xl font-bold text-gray-900 placeholder:text-gray-400 outline-none transition-colors"
          />
        </div>
      </section>

      <section className="order-1 sm:order-3 text-center py-8 sm:py-6 bg-white sm:bg-transparent border border-gray-200 sm:border-0 rounded-3xl sm:rounded-none shadow-sm sm:shadow-none">
        <p className="sm:hidden text-xs font-bold tracking-widest uppercase text-gray-500 mb-4">Amount</p>
        <div className="inline-flex items-center gap-2">
          <span className="text-5xl sm:text-3xl font-bold sm:font-medium text-[#007A64] sm:text-gray-400">$</span>
          <input
            type="number"
            min="0"
            step="0.01"
            value={amount}
            onChange={e => onAmountChange(e.target.value)}
            placeholder="0.00"
            className="w-48 bg-transparent text-center text-[64px] sm:text-[56px] font-bold text-gray-900 placeholder:text-gray-300 outline-none border-none focus:ring-0"
            style={{ fontVariantNumeric: 'tabular-nums' }}
          />
        </div>
      </section>

      <section className="order-5 sm:order-4 pb-4 border-b border-gray-100">
        <div className="flex items-center justify-center flex-wrap gap-2 text-sm font-medium text-gray-600">
          <span>Paid by</span>
          <div className="relative inline-block w-48 text-left">
            <CustomDropdown
              value={payerId}
              onChange={onPayerChange}
              options={users.map(u => ({ value: u.id }))}
              className="!w-full"
              renderSelected={(opt) => {
                const u = users.find(usr => usr.id === opt.value);
                return (
                  <>
                    <div className={clsx("w-6 h-6 rounded-full flex items-center justify-center font-bold text-white text-[10px]", avatarColor(opt.value))}>
                      {initials(u?.name || 'U')}
                    </div>
                    <span className="font-medium text-gray-900 text-sm whitespace-nowrap overflow-hidden text-ellipsis">{u?.id === currentUserId ? 'You' : u?.name}</span>
                  </>
                );
              }}
              renderOption={(opt, isSelected) => {
                const u = users.find(usr => usr.id === opt.value);
                return (
                  <>
                    <div className={clsx("w-8 h-8 rounded-full flex items-center justify-center font-bold text-white text-xs", avatarColor(opt.value))}>
                      {initials(u?.name || 'U')}
                    </div>
                    <span className="flex-1 font-medium text-sm">{u?.id === currentUserId ? `${u?.name} (You)` : u?.name}</span>
                    <div className={clsx("w-5 h-5 rounded-full border-2 flex items-center justify-center mr-2 shrink-0", isSelected ? "border-[#007A64]" : "border-gray-300")}>
                      {isSelected && <div className="w-2.5 h-2.5 rounded-full bg-[#007A64]" />}
                    </div>
                  </>
                );
              }}
            />
          </div>
          <span>and split</span>
          <button onClick={onSelectSplit} className="bg-[#EAF5F2] border border-[#007A64]/30 text-[#007A64] font-bold px-4 py-2 rounded-lg hover:bg-[#007A64]/20 transition-colors text-sm active:scale-95">{splitLabel}</button>
        </div>
      </section>

      <section className="order-3 sm:order-5 grid grid-cols-3 sm:flex sm:justify-around items-center gap-3 sm:gap-0 pt-0 sm:pt-2 pb-2 sm:pb-6">
        {[{ icon: 'calendar_today', label: 'Today' }, { icon: 'notes', label: 'Note' }, { icon: 'photo_camera', label: 'Camera' }].map(({ icon, label }) => (
          <button key={label} className="flex flex-col items-center gap-2 group bg-white sm:bg-transparent border border-gray-200 sm:border-0 rounded-2xl sm:rounded-none py-4 sm:py-0">
            <div className="w-12 h-12 rounded-full border border-gray-200 flex items-center justify-center group-hover:bg-[#EAF5F2] group-hover:border-[#007A64] group-hover:text-[#007A64] transition-colors text-gray-500">
              <MSIcon name={icon} className="text-xl transition-colors" />
            </div>
            <span className="text-xs font-medium text-gray-500">{label}</span>
          </button>
        ))}
      </section>
    </div>
  );
}
