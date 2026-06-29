import clsx from 'clsx';
import MSIcon from './MSIcon';
import type { PredictionAnalytics, User } from '../types/api';

interface SettlementPredictionCardProps {
  data: PredictionAnalytics;
  users: User[];
  currentUserId: number;
}

const formatMoney = (cents: number) => `$${(cents / 100).toFixed(2)}`;

export default function SettlementPredictionCard({ data, users, currentUserId }: SettlementPredictionCardProps) {
  const nameFor = (userId: number) => {
    if (userId === currentUserId) return 'You';
    return users.find(user => user.id === userId)?.name ?? 'Unknown';
  };

  const getReliabilityColor = (score: number) => {
    if (score >= 80) return 'text-[#007A64] bg-[#EAF5F2]';
    if (score >= 50) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  const slowestPayers = data.predictions
    .filter(p => p.direction === 'receivable')
    .sort((a, b) => b.predicted_settlement_days - a.predicted_settlement_days)
    .slice(0, 4);

  return (
    <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
          <MSIcon name="psychology" className="text-[18px]" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-gray-900">Settlement Predictions</h3>
          <p className="text-xs text-gray-500">Based on payment history</p>
        </div>
      </div>

      <div className="space-y-4">
        {slowestPayers.map((prediction, index) => (
          <div key={`${prediction.counterparty_id}-${prediction.group_id}-${index}`} className="flex items-center gap-4">
            <div className={clsx('w-10 h-10 rounded-xl flex items-center justify-center shrink-0', getReliabilityColor(prediction.reliability_score))}>
              <MSIcon name="schedule" className="text-[16px]" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-semibold text-gray-900 truncate">{nameFor(prediction.counterparty_id)}</h4>
              <div className="flex items-center gap-3 text-xs text-gray-500 mt-0.5">
                <span>{prediction.predicted_settlement_days}d predicted</span>
                <span>{prediction.reliability_score}% reliability</span>
              </div>
            </div>
            <div className="text-right shrink-0">
              <div className="text-sm font-bold text-[#007A64]">+{formatMoney(prediction.amount_cents)}</div>
              <div className="text-xs text-gray-500">owed to you</div>
            </div>
          </div>
        ))}
        {slowestPayers.length === 0 && (
          <p className="text-sm font-medium text-gray-500 text-center py-4">No outstanding receivables.</p>
        )}
      </div>
    </div>
  );
}