import { useState } from 'react';
import MSIcon from '../MSIcon';
import { useUpdatePlan } from '../../features/preplanning/api';
import type { Group, PlanDetail, PlanUpdate } from '../../types/api';

interface EditPlanModalProps {
  plan: PlanDetail;
  groups: Group[];
  onClose: () => void;
}

const toDateInput = (value: string) => value ? value.split('T')[0] : '';

export default function EditPlanModal({ plan, groups, onClose }: EditPlanModalProps) {
  const [name, setName] = useState(plan.name);
  const [startDate, setStartDate] = useState(toDateInput(plan.start_date));
  const [endDate, setEndDate] = useState(toDateInput(plan.end_date));
  const [totalBudget, setTotalBudget] = useState((plan.total_budget / 100).toFixed(2));
  const [status, setStatus] = useState<NonNullable<PlanUpdate['status']>>(plan.status);
  const [type, setType] = useState<NonNullable<PlanUpdate['type']>>(plan.type);
  const [groupId, setGroupId] = useState(plan.group_id ? String(plan.group_id) : '');
  const updatePlan = useUpdatePlan(plan.id);

  const handleSave = async () => {
    if (!name.trim() || !startDate || !endDate || !totalBudget) return;
    try {
      await updatePlan.mutateAsync({
        name: name.trim(),
        start_date: new Date(`${startDate}T00:00:00Z`).toISOString(),
        end_date: new Date(`${endDate}T00:00:00Z`).toISOString(),
        total_budget: Math.round(Number(totalBudget.replace(/,/g, '')) * 100),
        status,
        type,
        group_id: groupId ? Number(groupId) : null,
      });
      onClose();
    } catch {
      // Mutation state renders the API error in the modal.
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-2xl rounded-2xl bg-white shadow-2xl border border-gray-200 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Edit Plan</h2>
            <p className="text-sm text-gray-500 mt-1">Update plan details and total budget.</p>
          </div>
          <button onClick={onClose} className="w-10 h-10 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-100 transition-colors">
            <MSIcon name="close" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Plan Name</label>
            <input value={name} onChange={e => setName(e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 font-medium focus:outline-none focus:border-[#007A64] focus:ring-1 focus:ring-[#007A64]" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Start Date</label>
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 font-medium focus:outline-none focus:border-[#007A64] focus:ring-1 focus:ring-[#007A64]" />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">End Date</label>
              <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 font-medium focus:outline-none focus:border-[#007A64] focus:ring-1 focus:ring-[#007A64]" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Total Budget</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-bold">$</span>
                <input value={totalBudget} onChange={e => setTotalBudget(e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 pl-8 pr-4 font-bold focus:outline-none focus:border-[#007A64] focus:ring-1 focus:ring-[#007A64]" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Primary Group</label>
              <select value={groupId} onChange={e => setGroupId(e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 font-medium focus:outline-none focus:border-[#007A64] focus:ring-1 focus:ring-[#007A64]">
                <option value="">None</option>
                {groups.map(group => <option key={group.id} value={group.id}>{group.name}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Status</label>
              <select value={status} onChange={e => setStatus(e.target.value as NonNullable<PlanUpdate['status']>)} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 font-medium focus:outline-none focus:border-[#007A64] focus:ring-1 focus:ring-[#007A64]">
                <option value="draft">Draft</option>
                <option value="active">Active</option>
                <option value="completed">Completed</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Type</label>
              <select value={type} onChange={e => setType(e.target.value as NonNullable<PlanUpdate['type']>)} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 font-medium focus:outline-none focus:border-[#007A64] focus:ring-1 focus:ring-[#007A64]">
                <option value="custom">Custom</option>
                <option value="trip">Trip</option>
                <option value="monthly_budget">Monthly Budget</option>
              </select>
            </div>
          </div>

          {updatePlan.isError && (
            <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-[#D93F3C]">
              {updatePlan.error.message}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 bg-gray-50 px-6 py-4 border-t border-gray-100">
          <button onClick={onClose} className="px-4 py-2 text-sm font-bold text-gray-600 hover:text-gray-900 transition-colors">Cancel</button>
          <button onClick={handleSave} disabled={updatePlan.isPending} className="px-5 py-2.5 rounded-xl bg-[#007A64] hover:bg-[#00604f] text-white text-sm font-bold shadow-sm disabled:opacity-60 transition-colors">
            {updatePlan.isPending ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
