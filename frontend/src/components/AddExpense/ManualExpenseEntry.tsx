import React, { useState, useRef, useEffect } from 'react';
import clsx from 'clsx';
import MSIcon from '../MSIcon';
import { avatarColor, initials } from '../../lib/utils';
import type { User, GroupDetail, Plan } from '../../types/api';
import type { BooleanById, NumberById } from '../../types/ui';

interface AddExpenseFormProps {
  users: User[];
  groups: GroupDetail[];
  plans: Plan[];
  currentUserId: number;
  involvedUsers: BooleanById;
  activeIds: number[];
  description: string;
  amount: string;
  payerId: number;
  groupId: number | null;
  planId: number | null;
  splitPreview: NumberById;
  isProcessingReceipt: boolean;
  onDescriptionChange: (value: string) => void;
  onAmountChange: (value: string) => void;
  onPayerChange: (value: number) => void;
  onGroupChange: (value: number | null) => void;
  onPlanChange: (value: number | null) => void;
  onSelectFriends: () => void;
  onSelectSplit: () => void;
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export default function AddExpenseForm({
  users,
  groups,
  plans,
  currentUserId,
  involvedUsers,
  activeIds,
  description,
  amount,
  payerId,
  groupId,
  planId,
  splitPreview,
  isProcessingReceipt,
  onDescriptionChange,
  onAmountChange,
  onPayerChange,
  onGroupChange,
  onPlanChange,
  onSelectFriends,
  onSelectSplit,
  onFileUpload,
}: AddExpenseFormProps) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const payer = users.find(u => u.id === payerId) || { name: 'Someone' };
  const [isGroupOpen, setIsGroupOpen] = useState(false);
  const [isPlanOpen, setIsPlanOpen] = useState(false);
  const groupRef = useRef<HTMLDivElement>(null);
  const planRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (groupRef.current && event.target instanceof Node && !groupRef.current.contains(event.target)) {
        setIsGroupOpen(false);
      }
      if (planRef.current && event.target instanceof Node && !planRef.current.contains(event.target)) {
        setIsPlanOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedGroup = groups.find(g => g.id === groupId);
  const selectedPlan = plans.find(p => p.id === planId);

  return (
    <div className="overflow-y-auto flex-1 no-scrollbar p-5 sm:p-6 pb-6 space-y-6 flex flex-col bg-gray-50">
      
      {/* AMOUNT CARD */}
      <div className="bg-white border border-gray-200 rounded-2xl p-8 flex flex-col items-center justify-center relative shadow-sm">
        <label className="text-[10px] font-bold tracking-[0.15em] uppercase text-gray-500 mb-2">Amount</label>
        <div className="flex items-center justify-center">
          <span className="text-5xl text-gray-400 font-medium mr-2">$</span>
          <input
            type="number"
            min="0"
            step="0.01"
            value={amount}
            onChange={e => onAmountChange(e.target.value)}
            placeholder="0.00"
            className="w-[180px] text-6xl font-medium text-gray-900 bg-transparent outline-none text-center placeholder:text-gray-300"
            style={{ fontVariantNumeric: 'tabular-nums' }}
          />
        </div>
      </div>

      {/* DESCRIPTION BLOCK */}
      <div>
        <label className="block text-[10px] font-bold tracking-[0.15em] uppercase text-gray-500 mb-2 px-1">Description</label>
        <div className="bg-white border border-gray-200 shadow-sm rounded-xl px-5 py-4 flex items-center focus-within:border-[#007A64] focus-within:ring-1 focus-within:ring-[#007A64] transition-all">
          <input
            type="text"
            value={description}
            onChange={e => onDescriptionChange(e.target.value)}
            placeholder="What was this for?"
            className="w-full text-base text-gray-900 bg-transparent outline-none placeholder:text-gray-400"
          />
        </div>
      </div>

      {/* CATEGORY & TAGS ROW */}
      <div className="flex gap-4">
        {/* Category */}
        <button type="button" onClick={() => alert('Category selection coming soon!')} className="flex-1 text-left bg-white border border-gray-200 shadow-sm rounded-xl p-4 relative group cursor-pointer hover:border-gray-300 transition-colors">
          <div className="flex justify-between items-center mb-3">
            <span className="text-[10px] font-bold tracking-[0.15em] uppercase text-gray-500">Category</span>
            <MSIcon name="chevron_right" style={{ fontSize: 14 }} className="text-gray-400" />
          </div>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-[#EAF5F2] flex items-center justify-center text-[#007A64]">
              <MSIcon name="restaurant" style={{ fontSize: 16 }} />
            </div>
            <span className="text-gray-900 font-medium text-sm">Dining</span>
          </div>
        </button>

        {/* Tags */}
        <button type="button" onClick={() => alert('Tag selection coming soon!')} className="flex-1 text-left bg-white border border-gray-200 shadow-sm rounded-xl p-4 relative group cursor-pointer hover:border-gray-300 transition-colors">
          <div className="flex justify-between items-center mb-3">
            <span className="text-[10px] font-bold tracking-[0.15em] uppercase text-gray-500">Tags</span>
            <MSIcon name="add" style={{ fontSize: 14 }} className="text-gray-400" />
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-3 py-1 bg-gray-100 text-gray-600 text-[11px] font-medium rounded-full">Work</span>
            <span className="px-3 py-1 border border-[#007A64] text-[#007A64] bg-[#EAF5F2] text-[11px] font-medium rounded-full">Urgent</span>
          </div>
        </button>
      </div>

      {/* GROUP & PLAN ROW */}
      <div className="flex gap-4">
        {/* Group */}
        <div ref={groupRef} className="flex-1 relative">
          <button type="button" onClick={() => setIsGroupOpen(!isGroupOpen)} className="w-full flex-1 text-left bg-white border border-gray-200 shadow-sm rounded-xl p-4 relative group cursor-pointer hover:border-gray-300 transition-colors">
            <div className="flex justify-between items-center mb-3">
              <span className="text-[10px] font-bold tracking-[0.15em] uppercase text-gray-500">Group</span>
              <MSIcon name="chevron_right" style={{ fontSize: 14 }} className="text-gray-400" />
            </div>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                <MSIcon name="groups" style={{ fontSize: 16 }} />
              </div>
              <span className="text-gray-900 font-medium text-sm truncate">{selectedGroup ? selectedGroup.name : 'No Group Selected'}</span>
            </div>
          </button>
          {isGroupOpen && (
            <div className="absolute top-full left-0 w-full mt-2 bg-white rounded-xl shadow-lg border border-gray-100 z-50 max-h-64 overflow-y-auto py-2">
              <button type="button" onClick={() => { onGroupChange(null); setIsGroupOpen(false); }} className="w-full text-left px-4 py-3 hover:bg-gray-50 text-gray-900 font-medium text-sm border-b border-gray-100">No Group</button>
              {groups.map(g => (
                <button type="button" key={g.id} onClick={() => { onGroupChange(g.id); setIsGroupOpen(false); }} className="w-full text-left px-4 py-3 hover:bg-gray-50 text-gray-900 font-medium text-sm">{g.name}</button>
              ))}
            </div>
          )}
        </div>

        {/* Plan */}
        <div ref={planRef} className="flex-1 relative">
          <button type="button" onClick={() => setIsPlanOpen(!isPlanOpen)} className="w-full flex-1 text-left bg-white border border-gray-200 shadow-sm rounded-xl p-4 relative group cursor-pointer hover:border-gray-300 transition-colors">
            <div className="flex justify-between items-center mb-3">
              <span className="text-[10px] font-bold tracking-[0.15em] uppercase text-gray-500">Plan</span>
              <MSIcon name="chevron_right" style={{ fontSize: 14 }} className="text-gray-400" />
            </div>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-purple-50 flex items-center justify-center text-purple-600">
                <MSIcon name="map" style={{ fontSize: 16 }} />
              </div>
              <span className="text-gray-900 font-medium text-sm truncate">{selectedPlan ? selectedPlan.name : 'No Plan Selected'}</span>
            </div>
          </button>
          {isPlanOpen && (
            <div className="absolute top-full left-0 w-full mt-2 bg-white rounded-xl shadow-lg border border-gray-100 z-50 max-h-64 overflow-y-auto py-2">
              <button type="button" onClick={() => { onPlanChange(null); setIsPlanOpen(false); }} className="w-full text-left px-4 py-3 hover:bg-gray-50 text-gray-900 font-medium text-sm border-b border-gray-100">No Plan</button>
              {plans.map(p => (
                <button type="button" key={p.id} onClick={() => { onPlanChange(p.id); setIsPlanOpen(false); }} className="w-full text-left px-4 py-3 hover:bg-gray-50 text-gray-900 font-medium text-sm">{p.name}</button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* CHIPS FOR ADD MEMBERS */}
      <div>
        <label className="text-[10px] font-bold tracking-[0.15em] uppercase text-gray-500 mb-2 block px-1">
          {involvedUsers[currentUserId] ? 'With you and' : 'With'}
        </label>
        <div className="flex flex-wrap gap-2 items-center" onClick={onSelectFriends}>
          {activeIds.filter(id => id !== currentUserId).map(id => {
            const u = users.find(usr => usr.id === id);
            if (!u) return null;
            return (
              <div key={id} className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 shadow-sm hover:border-gray-300 rounded-full cursor-pointer transition-colors">
                <div className={clsx("w-5 h-5 rounded-full flex items-center justify-center font-bold text-white text-[9px]", avatarColor(u.id))}>
                  {initials(u.name)}
                </div>
                <span className="text-sm font-medium text-gray-700">{u.name}</span>
              </div>
            );
          })}
          <button className="flex items-center gap-1 px-3 py-1.5 border border-dashed border-gray-300 hover:border-gray-400 hover:bg-gray-50 bg-white rounded-full cursor-pointer transition-colors text-gray-500 shadow-sm">
            <MSIcon name="add" style={{ fontSize: 16 }} />
            <span className="text-sm font-medium">Add friends</span>
          </button>
        </div>
      </div>

      {/* DATE & RECEIPT BLOCK */}
      <div className="bg-white border border-gray-200 shadow-sm rounded-xl overflow-hidden shrink-0">
        <button type="button" onClick={() => alert('Date selection coming soon!')} className="w-full px-5 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors border-b border-gray-100">
          <div className="flex items-center gap-4">
            <MSIcon name="calendar_today" className="text-gray-500" style={{ fontSize: 20 }} />
            <span className="text-gray-900 text-sm font-medium">Today</span>
          </div>
          <MSIcon name="chevron_right" className="text-gray-400" style={{ fontSize: 18 }} />
        </button>

        <div onClick={() => document.getElementById('receipt-upload')?.click()} className={clsx("w-full px-5 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors cursor-pointer", isProcessingReceipt && "opacity-50 pointer-events-none")}>
          <div className="flex items-center gap-4">
            <MSIcon name="receipt_long" className="text-gray-500" style={{ fontSize: 20 }} />
            <span className="text-gray-900 text-sm font-medium">{isProcessingReceipt ? 'Scanning...' : 'Add Receipt'}</span>
          </div>
          <MSIcon name="add_a_photo" className="text-gray-400" style={{ fontSize: 18 }} />
          <input id="receipt-upload" type="file" accept="image/*,application/pdf" onChange={onFileUpload} className="hidden" disabled={isProcessingReceipt} />
        </div>
      </div>

      {/* SPLIT BLOCK */}
      <div>
        <div className="flex items-center justify-between mb-2 px-1">
          <label className="text-[10px] font-bold tracking-[0.15em] uppercase text-gray-500">Split Details</label>
          <button onClick={onSelectSplit} className="text-[#007A64] text-xs font-bold hover:text-[#00604f] transition-colors">
            Edit Split
          </button>
        </div>
        
        <div className="bg-white border border-gray-200 shadow-sm rounded-xl overflow-hidden">
          {/* Payee Selection / Payer info */}
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between hover:bg-gray-50 cursor-pointer transition-colors" onClick={onSelectSplit}>
             <div className="flex items-center gap-3">
               <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-[10px] font-bold text-gray-700">
                 {initials(payer.name)}
               </div>
               <span className="text-gray-500 text-xs font-medium">Paid by <span className="text-gray-900">{payerId === currentUserId ? 'You' : payer.name}</span></span>
             </div>
             <MSIcon name="edit" className="text-gray-400" style={{ fontSize: 14 }} />
          </div>

          {/* Actual splits */}
          <div className="divide-y divide-gray-100">
            {activeIds.map(id => {
              const u = users.find(usr => usr.id === id);
              if (!u) return null;
              const isMe = u.id === currentUserId;
              return (
                <div key={id} className="px-5 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className={clsx("w-10 h-10 rounded-full flex items-center justify-center font-bold text-white text-sm shadow-sm", isMe ? "bg-[#334155]" : avatarColor(u.id))}>
                      {initials(isMe ? 'You' : u.name)}
                    </div>
                    <span className="text-gray-900 font-medium text-sm">{isMe ? 'You' : u.name}</span>
                  </div>
                  <span className="text-gray-700 font-medium">${splitPreview[id] || '0.00'}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

