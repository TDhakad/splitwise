import { useState } from 'react';
import clsx from 'clsx';
import MSIcon from './MSIcon';
import { avatarColor, initials } from '../lib/utils';
import { useCreateGroup } from '../features/groups/api';
import useDebouncedValue from '../hooks/useDebouncedValue';
import { getErrorMessage } from '../lib/constants';
import type { MouseEvent } from 'react';
import type { User } from '../types/api';
import type { BooleanById } from '../types/ui';

interface CreateGroupModalProps {
  users: User[];
  currentUserId: number;
  onClose: () => void;
  onSave: () => void;
}
  
export default function CreateGroupModal({ users, currentUserId, onClose, onSave }: CreateGroupModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedMembers, setSelectedMembers] = useState<BooleanById>({ [currentUserId]: true });
  const [selectedEmails, setSelectedEmails] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const createGroup = useCreateGroup();
  const debouncedQuery = useDebouncedValue(query);

  const otherUsers = users.filter(u => u.id !== currentUserId);
  const filtered = otherUsers.filter(u =>
    u.name.toLowerCase().includes(debouncedQuery.toLowerCase()) ||
    (u.email ?? '').toLowerCase().includes(debouncedQuery.toLowerCase())
  );

  const toggleMember = (id: number) => setSelectedMembers(prev => ({ ...prev, [id]: !prev[id] }));
  const normalizedQuery = debouncedQuery.trim().toLowerCase();
  const canAddExactEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedQuery)
    && !users.some(user => user.email?.toLowerCase() === normalizedQuery)
    && !selectedEmails.includes(normalizedQuery);
  const memberCount = Object.values(selectedMembers).filter(Boolean).length + selectedEmails.length;

  const addEmail = () => {
    const email = query.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || selectedEmails.includes(email)) return;
    setSelectedEmails(prev => [...prev, email]);
    setQuery('');
  };

  const handleSave = async () => {
    if (!name.trim()) { setError('Group name is required.'); return; }
    setError('');
    try {
      const memberIds = Object.entries(selectedMembers).filter(([id, v]) => v && parseInt(id) !== currentUserId).map(([id]) => parseInt(id));
      await createGroup.mutateAsync({
        currentUserId,
        payload: { name: name.trim(), description: description.trim() || null },
        memberIds,
        memberEmails: selectedEmails,
      });
      onSave();
    } catch (e) { setError(getErrorMessage(e)); }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4">
        <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-md shadow-2xl flex flex-col overflow-hidden"
          style={{ maxHeight: '92dvh', animation: 'slideUp 0.3s cubic-bezier(0,0,0.2,1)' }}
          onClick={(e: MouseEvent<HTMLDivElement>) => e.stopPropagation()}>

          <header className="sticky top-0 bg-white border-b border-gray-200 flex items-center justify-between px-5 h-16 z-10">
            <button onClick={onClose} className="p-2 -ml-2 rounded-full hover:bg-gray-100 active:scale-95 transition-all">
              <MSIcon name="close" className="text-gray-900 text-xl" />
            </button>
            <h1 className="font-bold text-lg text-gray-900">New Group</h1>
            <button onClick={handleSave} disabled={createGroup.isPending || !name.trim()} className={clsx("font-bold text-sm px-4 py-2 rounded-lg transition-all active:scale-95", name.trim() ? "text-[#007A64] hover:bg-[#EAF5F2]" : "text-gray-400 cursor-not-allowed")}>
              {createGroup.isPending ? 'Creating...' : 'Create'}
            </button>
          </header>

          <div className="overflow-y-auto flex-1 no-scrollbar p-6 space-y-6">
            <div className="flex items-center gap-5">
              <div className="w-16 h-16 rounded-2xl bg-[#EAF5F2] flex items-center justify-center border border-[#007A64]/30 shrink-0">
                <MSIcon name="group" fill={1} className="text-3xl text-[#007A64]" />
              </div>
              <div className="flex-1 space-y-2">
                <input type="text" value={name} onChange={e => setName(e.target.value)}
                  placeholder="Group name *"
                  className="w-full bg-transparent border-b-2 border-gray-300 focus:border-[#007A64] py-2 text-lg font-bold text-gray-900 placeholder:text-gray-400 outline-none transition-colors" />
                <input type="text" value={description} onChange={e => setDescription(e.target.value)}
                  placeholder="Description (optional)"
                  className="w-full bg-transparent border-b border-gray-200 focus:border-[#007A64] py-1.5 text-sm text-gray-600 placeholder:text-gray-400 outline-none transition-colors" />
              </div>
            </div>

            <div className="flex items-center gap-3 bg-gray-50 p-3 rounded-xl border border-gray-100">
              <div className="flex -space-x-2">
                {[currentUserId, ...Object.entries(selectedMembers).filter(([id, v]) => v && parseInt(id) !== currentUserId).map(([id]) => parseInt(id))].slice(0, 4).map(uid => (
                  <div key={uid} className={clsx('w-8 h-8 rounded-full border-2 border-white flex items-center justify-center text-xs font-bold shadow-sm', avatarColor(uid))}>
                    {initials(users.find(u => u.id === uid)?.name ?? '?')}
                  </div>
                ))}
              </div>
              <span className="text-sm text-gray-600 font-semibold">{memberCount} member{memberCount !== 1 ? 's' : ''}</span>
            </div>

            <div>
              <p className="text-xs font-bold tracking-widest uppercase text-gray-500 mb-3">Add Members</p>
              <div className="relative mb-4">
                <MSIcon name="search" className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-xl" />
                <input type="text" value={query} onChange={e => setQuery(e.target.value)} placeholder="Search people…"
                  onKeyDown={e => { if (e.key === 'Enter' && canAddExactEmail) { e.preventDefault(); addEmail(); } }}
                  className="w-full h-12 bg-gray-100 rounded-xl pl-12 pr-4 text-sm text-gray-900 placeholder:text-gray-500 outline-none focus:ring-2 focus:ring-[#007A64]/50 transition-all" />
              </div>

              {selectedEmails.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {selectedEmails.map(email => (
                    <button key={email} onClick={() => setSelectedEmails(prev => prev.filter(item => item !== email))} className="flex items-center gap-2 rounded-full bg-[#EAF5F2] px-3 py-1.5 text-xs font-bold text-[#007A64]">
                      {email}
                      <MSIcon name="close" className="text-sm" />
                    </button>
                  ))}
                </div>
              )}

              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm divide-y divide-gray-100 overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4 bg-gray-50">
                  <div className="flex items-center gap-4">
                    <div className={clsx('w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shadow-sm', avatarColor(currentUserId))}>
                      {initials(users.find(u => u.id === currentUserId)?.name ?? 'Me')}
                    </div>
                    <div>
                      <p className="font-bold text-sm text-gray-900">You</p>
                      <p className="text-xs text-gray-500">Group creator</p>
                    </div>
                  </div>
                  <MSIcon name="check_circle" fill={1} className="text-[#007A64] text-2xl" />
                </div>

                {filtered.map(u => (
                  <div key={u.id} onClick={() => toggleMember(u.id)} className={clsx("flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-gray-50 transition-colors", selectedMembers[u.id] && "bg-[#EAF5F2]")}>
                    <div className="flex items-center gap-4">
                      <div className={clsx('w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shadow-sm', avatarColor(u.id))}>
                        {initials(u.name)}
                      </div>
                      <div>
                        <p className="font-bold text-sm text-gray-900">{u.name}</p>
                        {u.email && <p className="text-xs text-gray-500">{u.email}</p>}
                      </div>
                    </div>
                    <MSIcon
                      name={selectedMembers[u.id] ? "check_box" : "check_box_outline_blank"}
                      fill={selectedMembers[u.id] ? 1 : 0}
                      className={clsx("text-2xl", selectedMembers[u.id] ? "text-[#007A64]" : "text-gray-300")}
                    />
                  </div>
                ))}

                {canAddExactEmail && (
                  <button onClick={addEmail} className="w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-gray-50 transition-colors">
                    <div className="w-10 h-10 rounded-full bg-[#EAF5F2] text-[#007A64] flex items-center justify-center">
                      <MSIcon name="alternate_email" />
                    </div>
                    <div>
                      <p className="font-bold text-sm text-gray-900">Add by email</p>
                      <p className="text-xs text-gray-500">{normalizedQuery}</p>
                    </div>
                  </button>
                )}

                {filtered.length === 0 && !canAddExactEmail && (
                  <div className="px-5 py-8 text-center text-gray-500 text-sm font-medium">No users found</div>
                )}
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-3 bg-red-50 text-red-600 p-4 rounded-xl border border-red-100">
                <MSIcon name="error" className="text-xl shrink-0" />
                <span className="text-sm font-bold">{error}</span>
              </div>
            )}

            <button onClick={handleSave} disabled={createGroup.isPending || !name.trim()}
              className={clsx('w-full h-14 font-bold text-lg rounded-xl transition-all shadow-md flex items-center justify-center gap-2 active:scale-[0.98]',
                name.trim() ? 'bg-[#007A64] hover:bg-[#00604f] text-white' : 'bg-gray-100 text-gray-400 cursor-not-allowed shadow-none')}>
              {createGroup.isPending ? 'Creating group...' : 'Create Group'}
              {name.trim() && !createGroup.isPending && <MSIcon name="arrow_forward" className="text-xl" />}
            </button>
          </div>
        </div>
      </div>
      <style>{`@keyframes slideUp { from { transform: translateY(24px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }`}</style>
    </>
  );
}
