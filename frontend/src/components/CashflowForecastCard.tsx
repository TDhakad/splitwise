import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import clsx from 'clsx';
import MSIcon from './MSIcon';
import type { CashflowAnalytics } from '../types/api';

interface CashflowForecastCardProps {
  data: CashflowAnalytics;
}

const formatMoney = (cents: number) => `$${(cents / 100).toFixed(2)}`;

export default function CashflowForecastCard({ data }: CashflowForecastCardProps) {
  const chartData = data.monthly_forecasts.map(forecast => ({
    month: new Date(`${forecast.month}-01T00:00:00`).toLocaleDateString(undefined, { month: 'short' }),
    incoming: forecast.estimated_incoming_cents / 100,
    outgoing: -Math.abs(forecast.estimated_outgoing_cents / 100), // Negative for chart
    net: forecast.net_flow_cents / 100,
  }));

  const netBalance = data.current_receivables_cents - data.current_payables_cents;

  return (
    <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
          <MSIcon name="trending_up" className="text-[18px]" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-gray-900">Cash Flow Forecast</h3>
          <p className="text-sm text-gray-500 mt-1">Predicted income and expenses</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-[#EAF5F2] border border-[#c1e0d7] rounded-2xl p-4">
          <div className="text-2xl font-bold text-[#007A64]">{formatMoney(data.current_receivables_cents)}</div>
          <div className="text-sm font-medium text-gray-600 mt-1">Outstanding receivables</div>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
          <div className="text-2xl font-bold text-red-600">{formatMoney(data.current_payables_cents)}</div>
          <div className="text-sm font-medium text-gray-600 mt-1">Outstanding payables</div>
        </div>
      </div>

      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-bold text-gray-700">Net Position</span>
          <span className={clsx('text-lg font-bold', netBalance >= 0 ? 'text-[#007A64]' : 'text-red-600')}>
            {netBalance >= 0 ? '+' : '-'}{formatMoney(Math.abs(netBalance))}
          </span>
        </div>
        <div className="text-xs text-gray-500">
          Avg settlement delay: {data.avg_settlement_delay_days} days · Monthly spend: {formatMoney(data.avg_monthly_spend_cents)}
        </div>
      </div>

      <div className="h-40">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke="#F1F5F9" />
            <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fill: '#64748B', fontSize: 12, fontWeight: 600 }} />
            <YAxis tickLine={false} axisLine={false} tick={{ fill: '#94A3B8', fontSize: 11 }} tickFormatter={(value) => `$${Math.abs(value)}`} />
            <Tooltip 
              formatter={(value, name) => [`$${Math.abs(Number(value)).toFixed(2)}`, name === 'incoming' ? 'Income' : name === 'outgoing' ? 'Expenses' : 'Net']} 
              cursor={{ fill: '#F8FAFC' }} 
            />
            <Bar dataKey="incoming" fill="#007A64" radius={[2, 2, 0, 0]} />
            <Bar dataKey="outgoing" fill="#D93F3C" radius={[0, 0, 2, 2]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}