import clsx from 'clsx';
import MSIcon from '../MSIcon';
import LoadingState from '../ui/LoadingState';
import ErrorState from '../ui/ErrorState';
import { usePlan } from '../../features/preplanning/api';
import { formatMoney, getCategoryIcon, getPercent } from './planDetailUtils';
import type { PlanNavigationProps } from '../../types/ui';

interface PlanInsightsProps extends PlanNavigationProps {
  planId?: number | null;
}

const DAY_MS = 1000 * 60 * 60 * 24;

export default function PlanInsights({ planId, onNavigate }: PlanInsightsProps) {
  const planQuery = usePlan(planId);

  if (planQuery.isPending) return <LoadingState label="Loading insights..." />;
  if (planQuery.isError) return <ErrorState title="Unable to load insights" message={planQuery.error.message} />;

  const plan = planQuery.data;
  if (!plan) return <div className="p-8 text-center text-gray-500 font-bold">Plan not found</div>;

  const start = new Date(plan.start_date).getTime();
  const end = new Date(plan.end_date).getTime();
  const now = Date.now();

  const totalDays = Math.max(Math.ceil((end - start) / DAY_MS), 1);
  const elapsedDays = Math.min(Math.max(Math.ceil((now - start) / DAY_MS), 0), totalDays);
  const burnPerDay = elapsedDays > 0 ? plan.total_spent / elapsedDays : 0;
  const projectedTotal = elapsedDays > 0 ? Math.round(burnPerDay * totalDays) : plan.total_spent;
  const projectedDelta = projectedTotal - plan.total_budget;
  const remaining = plan.total_budget - plan.total_spent;
  const spentPercent = getPercent(plan.total_spent, plan.total_budget);

  const allocatedCategories = new Set<string>(plan.allocations.map(allocation => allocation.category));
  const unallocatedSpent = Object.entries(plan.allocations_spent)
    .filter(([category]) => !allocatedCategories.has(category))
    .reduce((sum, [, cents]) => sum + cents, 0);

  return (
    <div className="max-w-6xl mx-auto animate-in fade-in slide-in-from-right-8 duration-500">
      <button onClick={() => onNavigate('detail', plan.id)} className="flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-gray-900 mb-6 transition-colors">
        <MSIcon name="arrow_back" className="text-[18px]" /> Back to Plan
      </button>

      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
        <div>
          <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Budget vs Actual</div>
          <h1 className="text-4xl font-black text-gray-900 tracking-tight">{plan.name}</h1>
        </div>
        <div className={clsx(
          'px-4 py-2 rounded-xl font-bold text-sm flex items-center gap-2',
          projectedDelta > 0 ? 'bg-red-50 text-red-600' : 'bg-[#EAF5F2] text-[#007A64]',
        )}>
          <MSIcon name={projectedDelta > 0 ? 'trending_up' : 'trending_down'} className="text-[18px]" />
          {projectedDelta > 0 ? `Projected ${formatMoney(projectedDelta)} over` : `Projected ${formatMoney(Math.abs(projectedDelta))} under`}
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        <div className="flex-1 space-y-6">
          <div className="bg-white border border-gray-200 rounded-3xl p-6 shadow-sm">
            <h3 className="text-xl font-bold text-gray-900 mb-6">Spend Against Budget</h3>
            <div className="flex items-end justify-between mb-3">
              <div>
                <div className="text-3xl font-black text-gray-900">{formatMoney(plan.total_spent)}</div>
                <div className="text-sm font-medium text-gray-500 mt-1">spent of {formatMoney(plan.total_budget)} budget</div>
              </div>
              <div className="text-right">
                <div className={clsx('text-2xl font-black', remaining < 0 ? 'text-red-600' : 'text-[#007A64]')}>{formatMoney(remaining)}</div>
                <div className="text-sm font-medium text-gray-500 mt-1">{remaining < 0 ? 'over budget' : 'remaining'}</div>
              </div>
            </div>
            <div className="h-3 w-full bg-gray-100 rounded-full overflow-hidden">
              <div className={clsx('h-full rounded-full', spentPercent >= 100 ? 'bg-red-500' : 'bg-[#007A64]')} style={{ width: `${spentPercent}%` }} />
            </div>
            <div className="mt-2 text-xs font-bold text-gray-500">{spentPercent}% of budget used · {elapsedDays} of {totalDays} days elapsed</div>
          </div>

          <div className="bg-white border border-gray-200 rounded-3xl p-6 shadow-sm">
            <h3 className="text-xl font-bold text-gray-900 mb-6">Category Breakdown</h3>
            <div className="space-y-6">
              {plan.allocations.map(allocation => {
                const spent = plan.allocations_spent[allocation.category] ?? 0;
                const percent = getPercent(spent, allocation.allocated_amount);
                const over = spent > allocation.allocated_amount;
                const style = getCategoryIcon(allocation.category);
                return (
                  <div key={allocation.id}>
                    <div className="flex items-center gap-3 mb-2">
                      <div className={clsx('w-8 h-8 rounded-lg flex items-center justify-center shrink-0', style.bg, style.text)}>
                        <MSIcon name={style.icon} className="text-[18px]" />
                      </div>
                      <span className="flex-1 font-bold text-gray-900">{allocation.category}</span>
                      <span className={clsx('text-sm font-bold', over ? 'text-red-600' : 'text-gray-700')}>
                        {formatMoney(spent)} <span className="text-gray-400 font-medium">/ {formatMoney(allocation.allocated_amount)}</span>
                      </span>
                    </div>
                    <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                      <div className={clsx('h-full rounded-full', over ? 'bg-red-500' : style.fill)} style={{ width: `${percent}%` }} />
                    </div>
                  </div>
                );
              })}
              {plan.allocations.length === 0 && (
                <p className="text-sm font-medium text-gray-500 text-center py-4">No category allocations yet.</p>
              )}
              {unallocatedSpent > 0 && (
                <div className="flex items-center justify-between pt-4 border-t border-gray-100 text-sm">
                  <span className="font-bold text-gray-500">Unallocated spending</span>
                  <span className="font-bold text-gray-700">{formatMoney(unallocatedSpent)}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="w-full lg:w-[360px] shrink-0">
          <div className="bg-white border border-gray-200 rounded-3xl p-6 shadow-sm sticky top-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                <MSIcon name="speed" className="text-[18px]" />
              </div>
              <h3 className="text-xl font-bold text-gray-900">Burn Rate</h3>
            </div>

            <div className="space-y-5">
              <div className="bg-gray-50 border border-gray-100 rounded-2xl p-5">
                <div className="text-3xl font-black text-gray-900">{formatMoney(Math.round(burnPerDay))}</div>
                <div className="text-sm font-medium text-gray-500 mt-1">average spend per day</div>
              </div>

              <div className="bg-gray-50 border border-gray-100 rounded-2xl p-5">
                <div className="text-3xl font-black text-gray-900">{formatMoney(projectedTotal)}</div>
                <div className="text-sm font-medium text-gray-500 mt-1">projected total at this pace</div>
                <div className={clsx('mt-3 text-xs font-bold', projectedDelta > 0 ? 'text-red-600' : 'text-[#007A64]')}>
                  {projectedDelta > 0
                    ? `${formatMoney(projectedDelta)} over the ${formatMoney(plan.total_budget)} budget`
                    : `${formatMoney(Math.abs(projectedDelta))} under the ${formatMoney(plan.total_budget)} budget`}
                </div>
              </div>

              <div className="bg-gray-50 border border-gray-100 rounded-2xl p-5">
                <div className="flex items-end justify-between mb-3">
                  <span className="text-xs font-bold text-gray-600">Time Elapsed</span>
                  <span className="text-2xl font-black text-gray-900">{getPercent(elapsedDays, totalDays)}%</span>
                </div>
                <div className="h-1.5 w-full bg-gray-200 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 rounded-full" style={{ width: `${getPercent(elapsedDays, totalDays)}%` }} />
                </div>
                <div className="mt-3 text-[10px] font-medium text-gray-500 text-center">
                  {elapsedDays} of {totalDays} days
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
