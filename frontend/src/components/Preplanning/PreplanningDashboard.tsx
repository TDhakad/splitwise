import MSIcon from '../MSIcon';
import LoadingState from '../ui/LoadingState';
import ErrorState from '../ui/ErrorState';
import { usePlans } from '../../features/preplanning/api';
import type { PlanNavigationProps } from '../../types/ui';

export default function PreplanningDashboard({ onNavigate }: PlanNavigationProps) {
  const plansQuery = usePlans();

  if (plansQuery.isPending) {
    return <LoadingState label="Loading plans..." />;
  }

  if (plansQuery.isError) {
    return <ErrorState title="Unable to load plans" message={plansQuery.error.message} />;
  }

  const plans = plansQuery.data ?? [];

  const totalAllocated = plans.reduce((acc, p) => acc + (p.total_budget || 0), 0) / 100;

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Preplanning Hub</h1>
          <p className="text-gray-500 mt-2 max-w-xl">
            Allocate your funds with precision before the month begins. Track proactive savings and upcoming expenses.
          </p>
        </div>
        <div className="flex bg-gray-200/60 p-1 rounded-xl">
          <button className="px-4 py-1.5 rounded-lg text-sm font-bold bg-white text-gray-900 shadow-sm">Active</button>
          <button className="px-4 py-1.5 rounded-lg text-sm font-semibold text-gray-500 hover:text-gray-900">Drafts</button>
          <button className="px-4 py-1.5 rounded-lg text-sm font-semibold text-gray-500 hover:text-gray-900">Completed</button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-bold text-gray-500 tracking-widest uppercase">Total Allocated</h3>
              <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
                <MSIcon name="account_balance_wallet" className="text-lg" />
              </div>
            </div>
            <div className="text-4xl font-black text-gray-900 tracking-tight">
              $<span className="text-[#007A64]">{totalAllocated.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
            </div>
          </div>
          <div className="mt-6 flex items-center gap-1.5 text-xs font-bold text-[#007A64] bg-[#EAF5F2] w-fit px-2 py-1 rounded-md">
            <MSIcon name="trending_up" className="text-[14px]" /> +15% from last month
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-bold text-gray-500 tracking-widest uppercase">Unassigned Funds</h3>
              <div className="w-8 h-8 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center">
                <MSIcon name="water_drop" className="text-lg" />
              </div>
            </div>
            <div className="text-4xl font-black text-gray-900 tracking-tight">
              $3,120<span className="text-gray-400">.50</span>
            </div>
          </div>
          <div className="mt-6">
            <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-purple-500 w-[20%] rounded-full" />
            </div>
            <div className="mt-2 text-xs font-semibold text-gray-500 text-right">20% of total portfolio</div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm flex items-center gap-4">
          <div className="w-14 h-14 bg-gray-50 border border-gray-200 rounded-xl flex flex-col items-center justify-center shrink-0">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">May</span>
            <span className="text-lg font-black text-gray-900">15</span>
          </div>
          <div>
            <h3 className="text-xs font-bold text-[#007A64] tracking-widest uppercase mb-1">Upcoming Funding Goal</h3>
            <h4 className="font-bold text-gray-900 text-lg leading-tight">Summer Trip Paris</h4>
            <p className="text-xs text-gray-500 font-medium mt-1">Auto-transfer $500 scheduled.</p>
          </div>
        </div>
      </div>

      {/* Active Plans Header */}
      <div className="flex items-end justify-between pt-4">
        <h2 className="text-2xl font-bold text-gray-900">Active Plans</h2>
        <button onClick={() => onNavigate('create')} className="text-sm font-bold text-[#007A64] hover:text-[#00604f] flex items-center gap-1">
          CREATE PLAN <MSIcon name="add" className="text-[18px]" />
        </button>
      </div>

      {/* Plans Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {plans.map(plan => (
          <div 
            key={plan.id}
            onClick={() => onNavigate('detail', plan.id)}
            className="bg-white border border-gray-200 rounded-3xl p-6 shadow-sm hover:shadow-md transition-shadow cursor-pointer group flex flex-col"
          >
            <div className="flex justify-between items-start mb-8">
              <div>
                <span className="bg-gray-100 text-gray-600 text-xs font-bold px-2.5 py-1 rounded-md uppercase tracking-wider">
                  {plan.end_date ? `Goal: ${new Date(plan.end_date).toLocaleDateString(undefined, {month: 'short', year: 'numeric'})}` : 'No Goal Date'}
                </span>
                <h3 className="text-2xl font-black text-gray-900 mt-3 group-hover:text-[#007A64] transition-colors">{plan.name}</h3>
              </div>
              <button className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-400">
                <MSIcon name="more_vert" />
              </button>
            </div>

            <div className="mb-8">
              <div className="flex items-end justify-between mb-2">
                <div className="text-xl font-bold text-gray-900">
                  <span className="text-[#007A64]">${((plan.total_spent || 0) / 100).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span> <span className="text-gray-400 text-lg">/ ${(plan.total_budget / 100).toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                </div>
                <div className="text-sm font-bold text-gray-500">{plan.total_budget > 0 ? Math.round(((plan.total_spent || 0) / plan.total_budget) * 100) : 0}% Spent</div>
              </div>
              <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-[#007A64] rounded-full transition-all" style={{ width: `${plan.total_budget > 0 ? Math.min(((plan.total_spent || 0) / plan.total_budget) * 100, 100) : 0}%` }} />
              </div>
            </div>

            <button onClick={(e) => { e.stopPropagation(); onNavigate('insights', plan.id); }} className="w-full mt-auto py-3 rounded-xl border border-gray-200 font-bold text-gray-600 hover:bg-gray-50 transition-colors text-sm uppercase tracking-wide">
              Adjust Allocations
            </button>
          </div>
        ))}

      </div>
    </div>
  );
}
