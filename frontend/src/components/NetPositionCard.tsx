import { Area, AreaChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { NetHistoryPoint } from '../types/api';

interface NetPositionCardProps {
  history: NetHistoryPoint[];
}

export default function NetPositionCard({ history }: NetPositionCardProps) {
  const data = history.map(point => ({
    month: new Date(`${point.month}-01T00:00:00`).toLocaleDateString(undefined, { month: 'short', year: '2-digit' }),
    net: point.net_cents / 100,
  }));

  return (
    <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
      <div className="mb-8">
        <h3 className="text-xl font-bold text-gray-900">Net Position Over Time</h3>
        <p className="text-sm text-gray-500 mt-1">Cumulative balance — above zero means you are owed</p>
      </div>

      <div className="h-56">
        {data.length === 0 ? (
          <div className="h-full flex items-center justify-center rounded-xl bg-gray-50 text-sm font-semibold text-gray-500">
            No balance history yet.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
              <defs>
                <linearGradient id="netFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#007A64" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#007A64" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke="#F1F5F9" />
              <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fill: '#64748B', fontSize: 12, fontWeight: 600 }} />
              <YAxis tickLine={false} axisLine={false} tick={{ fill: '#94A3B8', fontSize: 11 }} tickFormatter={(value) => `$${value}`} />
              <Tooltip formatter={(value) => [`$${Number(value).toFixed(2)}`, 'Net']} cursor={{ stroke: '#CBD5E1' }} />
              <ReferenceLine y={0} stroke="#CBD5E1" strokeDasharray="4 4" />
              <Area type="monotone" dataKey="net" stroke="#007A64" strokeWidth={2.5} fill="url(#netFill)" />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
