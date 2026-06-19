import React, { useState } from 'react';
import clsx from 'clsx';
import MSIcon from '../MSIcon';
import { avatarColor, initials } from '../../lib/utils';
import useDebouncedValue from '../../hooks/useDebouncedValue';
import type { Dispatch, SetStateAction } from 'react';
import type { User } from '../../types/api';
import type { BooleanById } from '../../types/ui';

interface SelectFriendsStepProps {
  users: User[];
  currentUserId: number;
  involvedUsers: BooleanById;
  setInvolvedUsers: Dispatch<SetStateAction<BooleanById>>;
  listLabel: string;
  onBack: () => void;
  onDone: () => void;
}

export default function SelectFriendsStep({ users, currentUserId, involvedUsers, setInvolvedUsers, listLabel, onBack, onDone }: SelectFriendsStepProps) {
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebouncedValue(query);
  const filtered = users.filter(u => {
    const nameStr = u.id === currentUserId ? `${u.name} (You)` : u.name;
    return nameStr.toLowerCase().includes(debouncedQuery.toLowerCase()) || (u.email ?? '').toLowerCase().includes(debouncedQuery.toLowerCase());
  });
  const selectedCount = users.filter(u => involvedUsers[u.id]).length;
  const grouped = filtered.reduce<Record<string, User[]>>((acc, u) => {
    const l = u.id === currentUserId ? 'Y' : u.name[0].toUpperCase();
    if (!acc[l]) acc[l] = [];
    acc[l].push(u);
    return acc;
  }, {});
  const toggle = (id: number) => setInvolvedUsers(prev => ({ ...prev, [id]: !prev[id] }));

  return (
    <>
      <header className="sticky top-0 bg-white border-b border-gray-200 flex items-center justify-between px-5 h-16 z-10">
        <button onClick={onBack} className="p-2 -ml-2 rounded-full hover:bg-gray-100 active:scale-95 transition-all"><MSIcon name="arrow_back" className="text-[#007A64] text-xl" /></button>
        <h1 className="font-bold text-lg text-gray-900">Select friends</h1>
        <button onClick={onDone} className="font-bold text-sm text-[#007A64] px-4 py-2 rounded-lg hover:bg-[#EAF5F2] active:scale-95 transition-all">Save</button>
      </header>
      <div className="overflow-y-auto flex-1 no-scrollbar px-6 pt-6 pb-24">
        <div className="relative mb-6">
          <MSIcon name="search" className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-xl" />
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search by name or email"
            className="w-full h-12 bg-gray-100 rounded-xl pl-12 pr-4 border-none outline-none text-sm text-gray-900 placeholder:text-gray-500 focus:ring-2 focus:ring-[#007A64]"
          />
        </div>
        {Object.keys(grouped).sort().length > 0 && (
          <section>
            <h2 className="text-xs font-bold tracking-widest uppercase text-gray-500 mb-3">{listLabel}</h2>
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm divide-y divide-gray-100 overflow-hidden">
              {Object.keys(grouped).sort((a, b) => a === 'Y' && grouped[a].some(u => u.id === currentUserId) ? -1 : b === 'Y' && grouped[b].some(u => u.id === currentUserId) ? 1 : a.localeCompare(b)).map(letter => (
                <React.Fragment key={letter}>
                  <div className="px-5 py-2 bg-gray-50 text-xs font-bold text-gray-500">
                    {letter === 'Y' && grouped[letter].some(u => u.id === currentUserId) ? 'YOU' : letter}
                  </div>
                  {grouped[letter].map(u => (
                    <div key={u.id} onClick={() => toggle(u.id)} className={clsx("flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors cursor-pointer", involvedUsers[u.id] && "bg-[#EAF5F2]")}>
                      <div className="flex items-center gap-4">
                        <div className={clsx('w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shadow-sm', avatarColor(u.id))}>{initials(u.name)}</div>
                        <div><p className="font-bold text-gray-900 text-sm">{u.id === currentUserId ? `${u.name} (You)` : u.name}</p>{u.email && <p className="text-xs text-gray-500">{u.email}</p>}</div>
                      </div>
                      <MSIcon name={involvedUsers[u.id] ? "check_box" : "check_box_outline_blank"} fill={involvedUsers[u.id] ? 1 : 0} className={clsx("text-2xl", involvedUsers[u.id] ? "text-[#007A64]" : "text-gray-300")} />
                    </div>
                  ))}
                </React.Fragment>
              ))}
            </div>
          </section>
        )}
      </div>
      <div className="absolute bottom-6 right-6">
        <button onClick={onDone} className="bg-[#007A64] hover:bg-[#00604f] text-white h-14 px-8 rounded-full shadow-lg flex items-center gap-3 active:scale-95 transition-all font-bold text-sm tracking-wider uppercase">
          Done {selectedCount > 0 && `(${selectedCount})`} <MSIcon name="check" className="text-xl" />
        </button>
      </div>
    </>
  );
}
