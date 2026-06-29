import type { ReceiptItemAnalytics } from '../types/api';

interface ReceiptItemsCardProps {
  data: ReceiptItemAnalytics;
}

const formatMoney = (cents: number) => `$${(cents / 100).toFixed(2)}`;

export default function ReceiptItemsCard({ data }: ReceiptItemsCardProps) {
  const maxAmount = Math.max(...data.top_items.map(item => item.amount_cents), 1);

  return (
    <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
      <h3 className="text-lg font-bold text-gray-900 mb-2">Top Receipt Items</h3>
      <p className="text-xs font-semibold text-gray-500 mb-6">
        {data.purchase_count} itemized purchases · {formatMoney(data.total_spent_cents)} total
      </p>

      <div className="space-y-5">
        {data.top_items.map(item => (
          <div key={item.name}>
            <div className="flex justify-between text-[13px] mb-1.5 gap-3">
              <span className="font-semibold text-gray-900 truncate">{item.name}</span>
              <span className="text-gray-600 font-medium shrink-0">{formatMoney(item.amount_cents)}</span>
            </div>
            <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full rounded-full bg-[#007A64]" style={{ width: `${Math.max(8, (item.amount_cents / maxAmount) * 100)}%` }} />
            </div>
          </div>
        ))}
        {data.top_items.length === 0 && (
          <p className="text-sm font-medium text-gray-500 text-center py-4">No itemized receipts yet.</p>
        )}
      </div>
    </div>
  );
}
