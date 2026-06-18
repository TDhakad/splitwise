import React, { useState } from 'react';
import clsx from 'clsx';
import MSIcon from './MSIcon';
import { avatarColor, initials } from '../lib/utils';
import { API_BASE_URL, apiFetch } from '../lib/constants';

export default function CreateGroupModal({ users, currentUserId, onClose, onSave }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedMembers, setSelectedMembers] = useState({ [currentUserId]: true });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');

  const otherUsers = users.filter(u => u.id !== currentUserId);
  const filtered = otherUsers.filter(u =>
    u.name.toLowerCase().includes(query.toLowerCase()) ||
    (u.email ?? '').toLowerCase().includes(query.toLowerCase())
  );

  const toggleMember = (id) => setSelectedMembers(prev => ({ ...prev, [id]: !prev[id] }));
  const memberCount = Object.values(selectedMembers).filter(Boolean).length;

  const handleSave = async () => {
    if (!name.trim()) { setError('Group name is required.'); return; }
    setSaving(true); setError('');
    try {
      const res = await apiFetch(`/groups/?created_by=${currentUserId}`, {
        method: 'POST',
        body: JSON.stringify({ name: name.trim(), description: description.trim() || null }),
      });
      if (!res.ok) { const e = await res.json(); setError(e.detail ?? 'Failed to create group.'); return; }
      const group = await res.json();

      const memberIds = Object.entries(selectedMembers).filter(([id, v]) => v && parseInt(id) !== currentUserId).map(([id]) => parseInt(id));
      await Promise.all(memberIds.map(uid =>
        apiFetch(`/groups/${group.id}/members/${uid}`, { method: 'POST' })
      ));

      onSave();
    } catch { setError('Network error. Is the server running?'); }
    finally { setSaving(false); }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4">
        <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-md shadow-2xl flex flex-col overflow-hidden"
          style={{ maxHeight: '92dvh', animation: 'slideUp 0.3s cubic-bezier(0,0,0.2,1)' }}
          onClick={e => e.stopPropagation()}>

          <header className="sticky top-0 bg-white border-b border-gray-200 flex items-center justify-between px-5 h-16 z-10">
            <button onClick={onClose} className="p-2 -ml-2 rounded-full hover:bg-gray-100 active:scale-95 transition-all">
              <MSIcon name="close" className="text-gray-900 text-xl" />
            </button>
            <h1 className="font-bold text-lg text-gray-900">New Group</h1>
            <button onClick={handleSave} disabled={saving || !name.trim()} className={clsx("font-bold text-sm px-4 py-2 rounded-lg transition-all active:scale-95", name.trim() ? "text-[#007A64] hover:bg-[#EAF5F2]" : "text-gray-400 cursor-not-allowed")}>
              {saving ? 'Creating…' : 'Create'}
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
                  className="w-full h-12 bg-gray-100 rounded-xl pl-12 pr-4 text-sm text-gray-900 placeholder:text-gray-500 outline-none focus:ring-2 focus:ring-[#007A64]/50 transition-all" />
              </div>

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

                {filtered.length === 0 && (
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

            <button onClick={handleSave} disabled={saving || !name.trim()}
              className={clsx('w-full h-14 font-bold text-lg rounded-xl transition-all shadow-md flex items-center justify-center gap-2 active:scale-[0.98]',
                name.trim() ? 'bg-[#007A64] hover:bg-[#00604f] text-white' : 'bg-gray-100 text-gray-400 cursor-not-allowed shadow-none')}>
              {saving ? 'Creating group…' : 'Create Group'}
              {name.trim() && !saving && <MSIcon name="arrow_forward" className="text-xl" />}
            </button>
          </div>
        </div>
      </div>
      <style>{`@keyframes slideUp { from { transform: translateY(24px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }`}</style>
    </>
  );
}
