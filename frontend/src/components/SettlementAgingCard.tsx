import clsx from 'clsx';
import type { StandingAnalytics, User } from '../types/api';

interface SettlementAgingCardProps {
  aging: StandingAnalytics['aging'];
  users: User[];
  currentUserId: number;
}

const formatMoney = (cents: number) => `$${(cents / 100).toFixed(2)}`;

export default function SettlementAgingCard({ aging, users, currentUserId }: SettlementAgingCardProps) {
  const nameFor = (userId: number) => {
    if (userId === currentUserId) return 'You';
    return users.find(user => user.id === userId)?.name ?? 'Unknown';
  };

  const maxBucket = Math.max(
    ...aging.buckets.map(bucket => bucket.receivable_cents + bucket.payable_cents),
    1,
  );
  const overdue = aging.items.filter(item => item.age_days > 30).slice(0, 4);

  return (
    <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
      <div className="mb-6">
        <h3 className="text-xl font-bold text-gray-900">Settlement Aging</h3>
        <p className="text-sm text-gray-500 mt-1">How long balances have been outstanding</p>
      </div>

      <div className="space-y-4">
        {aging.buckets.map(bucket => {
          const total = bucket.receivable_cents + bucket.payable_cents;
          return (
            <div key={bucket.label} className="flex items-center gap-4">
              <span className="w-14 shrink-0 text-xs font-bold text-gray-500">{bucket.label}d</span>
              <div className="flex-1 h-5 flex rounded-full overflow-hidden bg-gray-100">
                <div className="h-full bg-[#007A64]" style={{ width: `${(bucket.receivable_cents / maxBucket) * 100}%` }} />
                <div className="h-full bg-[#D93F3C]" style={{ width: `${(bucket.payable_cents / maxBucket) * 100}%` }} />
              </div>
              <span className="w-20 shrink-0 text-right text-xs font-semibold text-gray-700">
                {total === 0 ? '—' : formatMoney(total)}
              </span>
            </div>
          );
        })}
      </div>

      <div className="flex items-center gap-5 mt-5 text-[11px] font-bold text-gray-500">
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#007A64]" /> Owed to you</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#D93F3C]" /> You owe</span>
      </div>

      {overdue.length > 0 && (
        <div className="mt-6 pt-5 border-t border-gray-100">
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-3">Outstanding over 30 days</p>
          <div className="space-y-3">
            {overdue.map((item, index) => (
              <div key={`${item.counterparty_id}-${item.group_id}-${index}`} className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{nameFor(item.counterparty_id)}</p>
                  <p className="text-xs text-gray-500">{item.age_days} days</p>
                </div>
                <span className={clsx('text-sm font-bold shrink-0', item.direction === 'receivable' ? 'text-[#007A64]' : 'text-[#D93F3C]')}>
                  {item.direction === 'receivable' ? '+' : '-'}{formatMoney(item.amount_cents)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
