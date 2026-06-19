import { useState, useMemo, useEffect } from 'react';
import MSIcon from '../MSIcon';
import useDebouncedValue from '../../hooks/useDebouncedValue';
import type { GroupWithOptionalAvatar } from '../../types/ui';

interface AddGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  groups: GroupWithOptionalAvatar[];
  initialSelectedIds: number[];
  onSave: (selectedIds: number[]) => void;
}

export default function AddGroupModal({ isOpen, onClose, groups, initialSelectedIds, onSave }: AddGroupModalProps) {
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search);

  // Sync initial selection when opened
  useEffect(() => {
    if (isOpen) {
      const timeoutId = window.setTimeout(() => {
        setSelectedIds(new Set(initialSelectedIds));
        setSearch('');
      }, 0);
      return () => window.clearTimeout(timeoutId);
    }
  }, [isOpen, initialSelectedIds]);

  const toggleGroup = (id: number) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const filteredGroups = useMemo(() => {
    return groups.filter(g => g.name.toLowerCase().includes(debouncedSearch.toLowerCase()));
  }, [groups, debouncedSearch]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white border border-gray-200 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-6 border-b border-gray-200 flex justify-between items-start">
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-1">Add Group</h2>
            <p className="text-sm font-medium text-gray-500">Select groups to collaborate on this plan.</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <MSIcon name="close" className="text-xl" />
          </button>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-gray-200 bg-gray-50">
          <div className="relative">
            <MSIcon name="search" className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-[18px]" />
            <input 
              type="text" 
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search groups by name..." 
              className="w-full bg-white border border-gray-200 rounded-xl py-3 pl-11 pr-4 text-gray-900 text-sm font-medium focus:outline-none focus:border-[#007A64] focus:ring-1 focus:ring-[#007A64] transition-all placeholder:text-gray-400 shadow-sm"
            />
          </div>
        </div>

        {/* List */}
        <div className="max-h-[340px] overflow-y-auto p-4 space-y-2 bg-white">
          {filteredGroups.map(g => {
            const isSelected = selectedIds.has(g.id);
            return (
              <div 
                key={g.id}
                onClick={() => toggleGroup(g.id)}
                className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all ${
                  isSelected ? 'bg-[#EAF5F2] border border-[#007A64]/30' : 'hover:bg-gray-50 border border-transparent'
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className="relative shrink-0">
                    <div className="w-10 h-10 rounded-full bg-gray-100 border border-gray-200 overflow-hidden flex items-center justify-center">
                      {g.avatar_url ? (
                         <img src={g.avatar_url} alt={g.name} className="w-full h-full object-cover" />
                      ) : (
                         <MSIcon name="group" className="text-gray-400 text-[20px]" />
                      )}
                    </div>
                    {isSelected && (
                      <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-[#007A64] rounded-full border border-white flex items-center justify-center">
                        <MSIcon name="check" className="text-white text-[10px] font-black" />
                      </div>
                    )}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-gray-900 leading-tight">{g.name}</h3>
                    <div className="flex items-center gap-1 mt-1 text-[11px] font-bold tracking-wide uppercase text-gray-500">
                      <MSIcon name="group" className="text-[12px]" /> 
                      {g.members?.length || 1} Members
                    </div>
                  </div>
                </div>
                <div className="shrink-0 ml-4">
                  {isSelected ? (
                    <div className="w-5 h-5 rounded bg-[#007A64] flex items-center justify-center shadow-sm">
                       <MSIcon name="check" className="text-white text-[14px] font-bold" />
                    </div>
                  ) : (
                    <div className="w-5 h-5 rounded border-2 border-gray-300 bg-white"></div>
                  )}
                </div>
              </div>
            );
          })}
          {filteredGroups.length === 0 && (
            <div className="text-center py-8 text-sm font-medium text-gray-500">
              No groups found.
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 flex justify-end items-center gap-4 bg-gray-50">
          <button onClick={onClose} className="text-sm font-bold text-gray-500 hover:text-gray-900 transition-colors px-2 py-2">
            Cancel
          </button>
          <button 
            onClick={() => onSave(Array.from(selectedIds))}
            className="flex items-center gap-1.5 bg-[#007A64] hover:bg-[#00604f] text-white px-5 py-2.5 rounded-xl text-sm font-bold transition-colors shadow-sm"
          >
            <MSIcon name="add" className="text-[18px]" /> Add Selected
          </button>
        </div>

      </div>
    </div>
  );
}
