import { useState } from 'react';
import MSIcon from '../MSIcon';
import { useGroups } from '../../features/groups/api';
import { useCreatePlan } from '../../features/preplanning/api';
import type { PlanNavigationProps } from '../../types/ui';

export default function CreatePlanFlow({ onNavigate }: PlanNavigationProps) {
  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [totalBudget, setTotalBudget] = useState('');
  const [groupId, setGroupId] = useState('');
  const [isGroupDropdownOpen, setIsGroupDropdownOpen] = useState(false);
  const groupsQuery = useGroups();
  const createPlan = useCreatePlan();
  const groups = groupsQuery.data ?? [];

  const handleCreate = async () => {
    if (!name || !startDate || !endDate || !totalBudget) return;
    try {
      const data = await createPlan.mutateAsync({
        name,
        start_date: startDate + "T00:00:00Z",
        end_date: endDate + "T00:00:00Z",
        total_budget: Math.round(Number(totalBudget.replace(/,/g, '')) * 100),
        status: 'active',
        type: 'custom',
        group_id: groupId ? parseInt(groupId, 10) : null
      });
      onNavigate('detail', data.id);
    } catch (e) {
      console.error(e);
    }
  };
  return (
    <div className="max-w-6xl mx-auto animate-in fade-in slide-in-from-right-8 duration-500">
      {/* Breadcrumb Header */}
      <button onClick={() => onNavigate('dashboard')} className="flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-gray-900 mb-6 transition-colors">
        <MSIcon name="arrow_back" className="text-[18px]" /> Back to Dashboard <span className="text-gray-300">/</span> <span className="text-gray-900">New Financial Plan</span>
      </button>

      <div className="mb-10">
        <h1 className="text-4xl font-black text-gray-900 tracking-tight">Create New Plan</h1>
        <p className="text-gray-500 mt-2 text-lg">
          Configure your budget allocations and strategic financial goals.
        </p>
      </div>

      {/* Stepper */}
      <div className="relative mb-12 max-w-3xl">
        <div className="absolute top-4 left-0 w-full h-0.5 bg-gray-200 -z-10" />
        <div className="absolute top-4 left-0 w-[10%] h-0.5 bg-[#007A64] -z-10 transition-all duration-500" />
        <div className="flex justify-between">
          <div className="flex flex-col items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-[#007A64] text-white flex items-center justify-center font-bold text-sm shadow-[0_0_0_4px_#F8F9FA]">
              1
            </div>
            <span className="text-xs font-bold text-[#007A64] uppercase tracking-wide">Basics</span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gray-200 text-gray-500 flex items-center justify-center font-bold text-sm shadow-[0_0_0_4px_#F8F9FA]">
              2
            </div>
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">Allocation</span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gray-200 text-gray-500 flex items-center justify-center font-bold text-sm shadow-[0_0_0_4px_#F8F9FA]">
              3
            </div>
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">Review</span>
          </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Main Form Area */}
        <div className="flex-1 bg-white border border-gray-200 rounded-3xl p-8 shadow-sm">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Plan Details</h2>
          <div className="w-full h-px bg-gray-100 mb-8" />

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Plan Name</label>
              <div className="relative">
                <MSIcon name="edit_document" className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="e.g., Q3 Marketing Expansion" className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3.5 pl-12 pr-4 text-gray-900 font-medium focus:outline-none focus:ring-2 focus:ring-[#007A64]/20 focus:border-[#007A64] transition-all" />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Start Date</label>
                <div className="relative">
                  <MSIcon name="calendar_today" className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3.5 pl-12 pr-4 text-gray-900 font-medium focus:outline-none focus:ring-2 focus:ring-[#007A64]/20 focus:border-[#007A64] transition-all" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">End Date</label>
                <div className="relative">
                  <MSIcon name="calendar_today" className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3.5 pl-12 pr-4 text-gray-900 font-medium focus:outline-none focus:ring-2 focus:ring-[#007A64]/20 focus:border-[#007A64] transition-all" />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="bg-gray-50 rounded-2xl p-6 border border-gray-200 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1.5 h-full bg-[#007A64]" />
                <label className="block text-[11px] font-bold text-gray-500 tracking-widest uppercase mb-3 ml-2">Total Budget Target</label>
                <div className="flex items-center text-4xl font-black text-gray-900 ml-2">
                  <span className="text-gray-400 mr-3">$</span>
                  <input type="text" value={totalBudget} onChange={e => setTotalBudget(e.target.value)} placeholder="0.00" className="w-full bg-transparent focus:outline-none placeholder:text-gray-300" />
                </div>
              </div>

              <div className="flex flex-col justify-center">
                <label className="block text-sm font-bold text-gray-700 mb-2">Track expenses from Group (Optional)</label>
                <div className="relative">
                  <button 
                    type="button" 
                    onClick={() => setIsGroupDropdownOpen(!isGroupDropdownOpen)}
                    className="w-full bg-white border border-gray-200 rounded-xl py-3.5 pl-12 pr-10 text-left text-gray-900 font-medium focus:outline-none focus:ring-2 focus:ring-[#007A64]/20 focus:border-[#007A64] transition-all hover:bg-gray-50"
                  >
                    <MSIcon name="group" className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    <span className="block truncate">{groupId ? groups.find(g => g.id.toString() === groupId)?.name : 'None (Explicit expenses only)'}</span>
                    <MSIcon name="expand_more" className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  </button>
                  
                  {isGroupDropdownOpen && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setIsGroupDropdownOpen(false)} />
                      <div className="absolute left-0 right-0 top-full mt-2 bg-white border border-gray-200 rounded-xl shadow-lg z-20 overflow-hidden py-2 max-h-60 overflow-y-auto animate-in fade-in slide-in-from-top-2 duration-200">
                        <button 
                          type="button"
                          onClick={() => { setGroupId(''); setIsGroupDropdownOpen(false); }}
                          className="w-full text-left px-5 py-3 hover:bg-[#EAF5F2] transition-colors flex items-center justify-between group"
                        >
                          <span className={!groupId ? 'text-[#007A64] font-bold' : 'text-gray-700 font-medium group-hover:text-[#007A64] truncate'}>None (Explicit expenses only)</span>
                          {!groupId && <MSIcon name="check" className="text-[#007A64] text-[18px] shrink-0 ml-2" />}
                        </button>
                        {groups.map(g => (
                          <button 
                            key={g.id}
                            type="button"
                            onClick={() => { setGroupId(g.id.toString()); setIsGroupDropdownOpen(false); }}
                            className="w-full text-left px-5 py-3 hover:bg-[#EAF5F2] transition-colors flex items-center justify-between group"
                          >
                            <span className={groupId === g.id.toString() ? 'text-[#007A64] font-bold truncate' : 'text-gray-700 font-medium group-hover:text-[#007A64] truncate'}>{g.name}</span>
                            {groupId === g.id.toString() && <MSIcon name="check" className="text-[#007A64] text-[18px] shrink-0 ml-2" />}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
                <p className="text-xs font-medium text-gray-500 mt-3">Auto-track your share of expenses in this group.</p>
              </div>
            </div>
          </div>

          <div className="w-full h-px bg-gray-100 my-8" />
          
          <div className="flex items-center justify-between">
            <button onClick={() => onNavigate('dashboard')} className="px-6 py-3 font-bold text-gray-500 hover:text-gray-900 transition-colors">
              Back
            </button>
            <button onClick={handleCreate} disabled={createPlan.isPending} className="px-8 py-3 bg-[#007A64] hover:bg-[#00604f] text-white rounded-xl font-bold flex items-center gap-2 shadow-md transition-all active:scale-95 disabled:opacity-50">
              {createPlan.isPending ? 'Creating...' : 'Continue'} <MSIcon name="arrow_forward" className="text-[18px]" />
            </button>
          </div>
        </div>

        {/* Live Preview Side Panel */}
        <div className="w-full lg:w-80 shrink-0">
          <div className="bg-white border border-gray-200 rounded-3xl p-6 shadow-sm sticky top-8">
            <div className="flex items-start justify-between mb-6">
              <div>
                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Live Preview</div>
                <h3 className="text-xl font-black text-gray-900">Draft Plan</h3>
              </div>
              <div className="w-8 h-8 rounded-lg bg-green-50 text-green-600 flex items-center justify-center">
                <MSIcon name="bar_chart" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-8">
              <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-1">Total Budget</div>
                <div className="text-lg font-bold text-[#007A64]">${totalBudget || '0'}</div>
              </div>
              <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-1">Duration</div>
                <div className="text-lg font-bold text-gray-900">{startDate && endDate ? `${Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24))} Days` : '--'}</div>
              </div>
            </div>

            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-6">Projected Allocation Breakdown</h4>
            
            <div className="flex justify-center mb-6">
              <div className="relative w-40 h-40">
                {/* Empty state donut chart */}
                <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                   <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#F3F4F6" strokeWidth="3" />
                   <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#007A64" strokeWidth="3" strokeDasharray="100, 100" className="opacity-20" />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                   <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Allocated</span>
                   <span className="text-xl font-black text-gray-900">100%</span>
                </div>
              </div>
            </div>

            <div className="space-y-3 mb-8">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-blue-400" />
                  <span className="font-semibold text-gray-700">Operations</span>
                </div>
                <span className="font-bold text-gray-900">$0</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-teal-400" />
                  <span className="font-semibold text-gray-700">R&D</span>
                </div>
                <span className="font-bold text-gray-900">$0</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-gray-300" />
                  <span className="font-semibold text-gray-700">Marketing</span>
                </div>
                <span className="font-bold text-gray-900">$0</span>
              </div>
            </div>

            <div className="flex items-start gap-2 bg-blue-50/50 p-3 rounded-xl">
              <MSIcon name="info" className="text-blue-500 text-[18px] shrink-0 mt-0.5" />
              <p className="text-[11px] font-medium text-gray-600 leading-relaxed">
                Changes made here are auto-saved as a draft. Final execution requires secondary approval from a senior manager.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
