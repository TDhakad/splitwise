import { formatMoney, getPercent } from './planDetailUtils';
import type { PlanDetail } from '../../types/api';

interface PlanMetricsProps {
  plan: PlanDetail;
}

export default function PlanMetrics({ plan }: PlanMetricsProps) {
  const allocPercent = getPercent(plan.total_allocated, plan.total_budget);
  const spentPercent = getPercent(plan.total_spent, plan.total_budget);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
      <div className="bg-white rounded-3xl p-6 border border-gray-200 shadow-sm">
        <div className="text-sm font-bold text-gray-500 mb-2">Total Budget</div>
        <div className="text-4xl font-black text-[#007A64]">{formatMoney(plan.total_budget)}</div>
      </div>

      <div className="bg-white rounded-3xl p-6 border border-gray-200 shadow-sm">
        <div className="text-sm font-bold text-gray-500 mb-2">Allocated</div>
        <div className="text-4xl font-black text-gray-900 mb-4">{formatMoney(plan.total_allocated)}</div>
        <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
          <div className="h-full bg-[#007A64] rounded-full" style={{ width: `${allocPercent}%` }} />
        </div>
      </div>

      <div className="bg-white rounded-3xl p-6 border border-gray-200 shadow-sm">
        <div className="text-sm font-bold text-gray-500 mb-2">Spent</div>
        <div className="text-4xl font-black text-gray-900 mb-4">{formatMoney(plan.total_spent)}</div>
        <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
          <div className="h-full bg-blue-500 rounded-full" style={{ width: `${spentPercent}%` }} />
        </div>
      </div>
    </div>
  );
}
