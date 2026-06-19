import MSIcon from '../MSIcon';
import type { GroupWithOptionalAvatar } from '../../types/ui';
import type { Plan } from '../../types/api';

interface PlanHeaderSectionProps {
  plan: Plan;
  durationDays: number | string;
  trackedGroups: GroupWithOptionalAvatar[];
  onBack: () => void;
  onAddExpense: () => void;
  onOpenGroups: () => void;
}

export default function PlanHeaderSection({ plan, durationDays, trackedGroups, onBack, onAddExpense, onOpenGroups }: PlanHeaderSectionProps) {
  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <button onClick={onBack} className="flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-gray-900 transition-colors">
          <MSIcon name="arrow_back" className="text-[18px]" /> Back to Dashboard
        </button>
        <button onClick={onAddExpense} className="bg-[#007A64] hover:bg-[#00604f] text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all shadow-sm active:scale-95">
          <MSIcon name="add" className="text-[18px]" /> Add Expense
        </button>
      </div>

      <div className="mb-10 flex flex-col md:flex-row md:justify-between md:items-end gap-4">
        <div>
          <div className="flex items-center gap-2 text-sm font-bold text-[#007A64] uppercase tracking-widest mb-3">
            <MSIcon name="event_note" className="text-[18px]" /> {plan.type === 'trip' ? 'Upcoming Trip' : 'Financial Plan'}
          </div>
          <h1 className="text-4xl font-black text-gray-900 tracking-tight">{plan.name}</h1>
          <p className="text-gray-500 mt-2 text-lg font-medium">
            {plan.start_date ? new Date(plan.start_date).toLocaleDateString() : 'N/A'} - {plan.end_date ? new Date(plan.end_date).toLocaleDateString() : 'N/A'} • {durationDays} Days
          </p>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm w-full md:w-auto md:min-w-[300px]">
          <div className="flex items-center justify-between gap-6 mb-3">
            <div className="flex items-center gap-2">
              <MSIcon name="group" className="text-gray-400 text-[18px]" />
              <div className="text-sm font-bold text-gray-700">Tracked Groups</div>
            </div>
            <button onClick={onOpenGroups} className="text-xs font-bold text-[#007A64] hover:text-[#00604f] flex items-center gap-1 transition-colors bg-[#EAF5F2] hover:bg-[#cdebe3] px-2 py-1 rounded-lg">
              <MSIcon name="add" className="text-[16px]" /> Add
            </button>
          </div>

          <div className="flex flex-wrap gap-2">
            {trackedGroups.length > 0 ? (
              trackedGroups.map(g => (
                <div key={g.id} className="bg-gray-50 border border-gray-200 text-xs font-bold text-gray-700 px-2.5 py-1 rounded-lg flex items-center gap-1.5">
                  <div className="w-4 h-4 rounded-full bg-gray-300 overflow-hidden flex items-center justify-center shrink-0">
                    {g.avatar_url ? <img src={g.avatar_url} alt="" className="w-full h-full object-cover" /> : <MSIcon name="group" className="text-gray-500 text-[10px]" />}
                  </div>
                  {g.name}
                </div>
              ))
            ) : (
              <div className="text-xs font-medium text-gray-500 italic">None (Explicit manual entry only)</div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
