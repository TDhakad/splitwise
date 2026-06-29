import clsx from 'clsx';
import MSIcon from './MSIcon';
import type { GroupAnalytics } from '../types/api';

interface GroupHealthCardProps {
  data: GroupAnalytics;
}

export default function GroupHealthCard({ data }: GroupHealthCardProps) {
  const topGroups = data.groups
    .filter(group => group.expense_count > 0)
    .sort((a, b) => b.balance_fairness_score - a.balance_fairness_score)
    .slice(0, 5);

  const getHealthColor = (score: number) => {
    if (score >= 80) return 'text-[#007A64] bg-[#EAF5F2]';
    if (score >= 60) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  const getHealthIcon = (score: number) => {
    if (score >= 80) return 'sentiment_very_satisfied';
    if (score >= 60) return 'sentiment_neutral';
    return 'sentiment_dissatisfied';
  };

  return (
    <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
      <h3 className="text-lg font-bold text-gray-900 mb-2">Group Health</h3>
      <p className="text-xs font-semibold text-gray-500 mb-6">Balance fairness and settlement velocity</p>

      <div className="space-y-4">
        {topGroups.map(group => (
          <div key={group.group_id} className="flex items-center gap-4">
            <div className={clsx('w-10 h-10 rounded-xl flex items-center justify-center shrink-0', getHealthColor(group.balance_fairness_score))}>
              <MSIcon name={getHealthIcon(group.balance_fairness_score)} className="text-[18px]" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-semibold text-gray-900 truncate">{group.name}</h4>
              <div className="flex items-center gap-3 text-xs text-gray-500 mt-0.5">
                <span>{group.expense_count} expenses</span>
                <span>{group.avg_settlement_days}d avg settlement</span>
              </div>
            </div>
            <div className="text-right shrink-0">
              <div className="text-sm font-bold text-gray-900">{group.balance_fairness_score}%</div>
              <div className="text-xs text-gray-500">fairness</div>
            </div>
          </div>
        ))}
        {topGroups.length === 0 && (
          <p className="text-sm font-medium text-gray-500 text-center py-4">No active groups yet.</p>
        )}
      </div>
    </div>
  );
}