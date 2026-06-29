import { useState } from 'react';
import MSIcon from '../MSIcon';
import LoadingState from '../ui/LoadingState';
import ErrorState from '../ui/ErrorState';
import { usePlans } from '../../features/preplanning/api';
import type { PlanNavigationProps } from '../../types/ui';

export default function PreplanningDashboard({ onNavigate }: PlanNavigationProps) {
  const [status, setStatus] = useState<'active' | 'draft' | 'completed'>('active');
  const [search, setSearch] = useState('');
  const plansQuery = usePlans(true, { status, search });

  if (plansQuery.isPending) {
    return <LoadingState label="Loading plans..." />;
  }

  if (plansQuery.isError) {
    return <ErrorState title="Unable to load plans" message={plansQuery.error.message} />;
  }

  const plans = plansQuery.data ?? [];

  const totalAllocated = plans.reduce((acc, p) => acc + (p.total_budget || 0), 0) / 100;
  const totalSpent = plans.reduce((acc, p) => acc + (p.total_spent || 0), 0) / 100;
  const overallSpentPct = totalAllocated > 0 ? (totalSpent / totalAllocated) * 100 : 0;

  const now = new Date();
  const futurePlans = plans.filter(p => p.end_date && new Date(p.end_date) >= now);
  futurePlans.sort((a, b) => new Date(a.end_date!).getTime() - new Date(b.end_date!).getTime());
  const nearestPlan = futurePlans[0] || null;
  const nearestPlanDate = nearestPlan?.end_date ? new Date(nearestPlan.end_date) : null;
  const nearestPlanDays = nearestPlanDate ? Math.ceil((nearestPlanDate.getTime() - now.getTime()) / (1000 * 3600 * 24)) : 0;

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
          {(['active', 'draft', 'completed'] as const).map(item => (
            <button key={item} onClick={() => setStatus(item)} className={`px-4 py-1.5 rounded-lg text-sm font-bold capitalize ${status === item ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}>
              {item === 'draft' ? 'Drafts' : item}
            </button>
          ))}
        </div>
      </div>
      <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search plans" className="h-11 w-full rounded-xl border border-gray-200 bg-white px-4 text-sm font-semibold text-gray-900 outline-none focus:border-[#007A64]" />

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
              <h3 className="text-xs font-bold text-gray-500 tracking-widest uppercase">Overall Spent</h3>
              <div className="w-8 h-8 rounded-full bg-orange-50 text-orange-600 flex items-center justify-center">
                <MSIcon name="shopping_cart" className="text-lg" />
              </div>
            </div>
            <div className="text-4xl font-black text-gray-900 tracking-tight">
              $<span className="text-orange-600">{totalSpent.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
            </div>
          </div>
          <div className="mt-6">
            <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-orange-500 rounded-full transition-all" style={{ width: `${Math.min(overallSpentPct, 100)}%` }} />
            </div>
            <div className="mt-2 flex justify-between text-xs font-semibold text-gray-500">
              <span>{overallSpentPct.toFixed(1)}% spent</span>
              <span>${(totalAllocated - totalSpent).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})} left</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm flex items-center gap-4">
          <div className="w-14 h-14 bg-gray-50 border border-gray-200 rounded-xl flex flex-col items-center justify-center shrink-0">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{nearestPlanDate ? nearestPlanDate.toLocaleString('default', { month: 'short' }) : '-'}</span>
            <span className="text-lg font-black text-gray-900">{nearestPlanDate ? nearestPlanDate.getDate() : '-'}</span>
          </div>
          <div>
            <h3 className="text-xs font-bold text-[#007A64] tracking-widest uppercase mb-1">Nearest Deadline</h3>
            <h4 className="font-bold text-gray-900 text-lg leading-tight truncate w-32 md:w-40" title={nearestPlan?.name}>{nearestPlan ? nearestPlan.name : 'No upcoming goals'}</h4>
            {nearestPlan ? (
              <p className="text-xs text-gray-500 font-medium mt-1">In {nearestPlanDays} day{nearestPlanDays !== 1 ? 's' : ''}</p>
            ) : (
              <p className="text-xs text-gray-500 font-medium mt-1">Set an end date on a plan</p>
            )}
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
