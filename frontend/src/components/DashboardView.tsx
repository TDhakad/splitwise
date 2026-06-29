import { useMemo } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import clsx from 'clsx';
import MSIcon from './MSIcon';
import NetPositionCard from './NetPositionCard';
import SettlementAgingCard from './SettlementAgingCard';
import ReceiptItemsCard from './ReceiptItemsCard';
import GroupHealthCard from './GroupHealthCard';
import SettlementPredictionCard from './SettlementPredictionCard';
import ShoppingInsightsCard from './ShoppingInsightsCard';
import CashflowForecastCard from './CashflowForecastCard';
import { initials } from '../lib/utils';
import { 
  useCashflowAnalytics, 
  useGroupAnalytics, 
  usePredictionAnalytics, 
  useReceiptItemAnalytics, 
  useShoppingInsights, 
  useSpendingAnalytics, 
  useStandingAnalytics 
} from '../features/analytics/api';
import type { DashboardProps } from '../types/ui';

export default function DashboardView({ balances, rawBalances, groups, users, currentUserId }: DashboardProps) {
    const analyticsQuery = useSpendingAnalytics(Boolean(currentUserId));
    const standingQuery = useStandingAnalytics(Boolean(currentUserId));
    const receiptItemsQuery = useReceiptItemAnalytics(Boolean(currentUserId));
    const groupAnalyticsQuery = useGroupAnalytics(Boolean(currentUserId));
    const predictionQuery = usePredictionAnalytics(Boolean(currentUserId));
    const shoppingQuery = useShoppingInsights(Boolean(currentUserId));
    const cashflowQuery = useCashflowAnalytics(Boolean(currentUserId));
    const netBalance = balances.net_balance || 0;
    const totalOwedToMe = balances.total_owed || 0;
    const totalIOwe = balances.total_owes || 0;

    const friendsSet = useMemo(() => {
        const set = new Set<number>();
        rawBalances.forEach(b => {
           if (b.from_user_id === currentUserId) set.add(b.to_user_id);
           if (b.to_user_id === currentUserId) set.add(b.from_user_id);
        });
        return set;
    }, [rawBalances, currentUserId]);

    const groupBalancesList = useMemo(() => {
        const groupBalancesMap: Record<number, number> = {};
        rawBalances.forEach(b => {
           if (b.group_id) {
              if (!groupBalancesMap[b.group_id]) groupBalancesMap[b.group_id] = 0;
              if (b.from_user_id === currentUserId) groupBalancesMap[b.group_id] -= b.amount;
              if (b.to_user_id === currentUserId) groupBalancesMap[b.group_id] += b.amount;
           }
        });

        return groups.map(g => ({
           id: g.id,
           name: g.name,
           memberCount: g.members?.length || 0,
           net: groupBalancesMap[g.id] || 0
        }));
    }, [rawBalances, groups, currentUserId]);

    const spendingAnalytics = analyticsQuery.data;
    const monthlyChartData = (spendingAnalytics?.monthly ?? []).map(item => ({
        month: new Date(`${item.month}-01T00:00:00`).toLocaleDateString(undefined, { month: 'short' }),
        amount: item.amount_cents / 100,
    }));
    const topCategories = spendingAnalytics?.categories.slice(0, 3) ?? [];
    const maxCategoryAmount = Math.max(...topCategories.map(category => category.amount_cents), 1);

    return (
       <div className="flex flex-col lg:flex-row gap-8 max-w-[1400px] mx-auto p-4 sm:p-6 lg:p-8 h-full overflow-y-auto">
          <div className="flex-1 space-y-6">
             <div className="bg-[#EAF5F2] rounded-[1.75rem] sm:rounded-2xl p-6 sm:p-8 border border-[#c1e0d7] shadow-sm relative overflow-hidden">
                <div className="absolute right-0 bottom-0 opacity-10 pointer-events-none">
                    <MSIcon name="account_balance" style={{ fontSize: 200 }} className="translate-x-12 translate-y-12" />
                </div>
                <p className="text-[11px] font-bold text-gray-700 tracking-[0.1em] mb-3 uppercase">Total Net Balance</p>
                <h2 className={clsx("text-5xl sm:text-5xl font-bold mb-3 tracking-tight", netBalance >= 0 ? "text-[#007A64]" : "text-red-600")}>
                   {netBalance >= 0 ? '+ ' : '- '}${Math.abs(netBalance).toFixed(2)}
                </h2>
                <p className="text-sm text-gray-600 font-medium">Across {groups.length} groups and {friendsSet.size} friends</p>
                <div className="grid grid-cols-2 gap-4 mt-7 sm:hidden">
                   <div className="bg-white/75 border border-white rounded-2xl p-4 shadow-sm">
                      <p className="text-xs font-bold text-gray-600 mb-2">Receivables</p>
                      <p className="text-2xl font-bold text-[#007A64]">${totalOwedToMe.toFixed(2)}</p>
                   </div>
                   <div className="bg-white/75 border border-white rounded-2xl p-4 shadow-sm">
                      <p className="text-xs font-bold text-gray-600 mb-2">Payables</p>
                      <p className="text-2xl font-bold text-[#D93F3C]">${totalIOwe.toFixed(2)}</p>
                   </div>
                </div>
             </div>

             <div className="hidden sm:flex flex-col sm:flex-row gap-6">
                <div className="flex-1 bg-white rounded-2xl p-6 border border-gray-200 shadow-sm relative overflow-hidden group hover:shadow-md transition-shadow cursor-pointer">
                   <div className="absolute top-0 bottom-0 right-0 w-1.5 bg-[#007A64]" />
                   <div className="flex justify-between items-start mb-8">
                      <div className="w-11 h-11 rounded-full bg-[#EAF5F2] flex items-center justify-center text-[#007A64]">
                         <MSIcon name="arrow_downward" className="rotate-45" />
                      </div>
                      <span className="bg-gray-100/80 text-gray-700 text-[11px] font-bold px-3 py-1.5 rounded-md tracking-wide uppercase">Receiving</span>
                   </div>
                   <p className="text-sm text-gray-500 mb-1">You are owed</p>
                   <h3 className="text-[32px] font-bold text-gray-900 mb-6">${totalOwedToMe.toFixed(2)}</h3>
                   <div className="flex items-center gap-3">
                       <div className="flex -space-x-2">
                           {[2,3].map(id => (
                               <div key={id} className="w-8 h-8 rounded-full border-2 border-white bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-600 z-10">{initials(users.find(u=>u.id===id)?.name || 'U')}</div>
                           ))}
                           <div className="w-8 h-8 rounded-full border-2 border-white bg-gray-100 flex items-center justify-center text-[10px] font-bold text-gray-500 z-0">+2</div>
                       </div>
                   </div>
                </div>

                <div className="flex-1 bg-white rounded-2xl p-6 border border-gray-200 shadow-sm relative overflow-hidden group hover:shadow-md transition-shadow cursor-pointer">
                   <div className="absolute top-0 bottom-0 right-0 w-1.5 bg-[#D93F3C]" />
                   <div className="flex justify-between items-start mb-8">
                      <div className="w-11 h-11 rounded-full bg-red-50 flex items-center justify-center text-[#D93F3C]">
                         <MSIcon name="arrow_upward" className="rotate-45" />
                      </div>
                      <span className="bg-gray-100/80 text-gray-700 text-[11px] font-bold px-3 py-1.5 rounded-md tracking-wide uppercase">Paying</span>
                   </div>
                   <p className="text-sm text-gray-500 mb-1">You owe</p>
                   <h3 className="text-[32px] font-bold text-gray-900 mb-6">${totalIOwe.toFixed(2)}</h3>
                   <div className="flex items-center gap-3">
                       <div className="flex -space-x-2">
                           {[4].map(id => (
                               <div key={id} className="w-8 h-8 rounded-full border-2 border-white bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-600 z-10">{initials(users.find(u=>u.id===id)?.name || 'U')}</div>
                           ))}
                       </div>
                   </div>
                </div>
             </div>

             <section className="lg:hidden">
                <div className="flex items-center justify-between mb-4">
                   <h3 className="text-2xl font-bold text-gray-900">Active Groups</h3>
                   <button className="text-[#007A64] text-sm font-bold">See All</button>
                </div>
                <div className="grid grid-cols-2 gap-4">
                   {groupBalancesList.slice(0, 2).map(g => (
                      <div key={g.id} className="bg-white rounded-2xl p-4 border border-gray-200 shadow-sm min-h-40 flex flex-col justify-between">
                         <div className="flex items-start justify-between">
                            <div className="w-11 h-11 bg-[#EAF5F2] rounded-xl flex items-center justify-center text-[#007A64]">
                               <MSIcon name="groups" />
                            </div>
                            <MSIcon name="more_horiz" className="text-gray-400" />
                         </div>
                         <div>
                            <h4 className="font-bold text-gray-900 leading-tight">{g.name}</h4>
                            <p className="text-xs text-gray-500 font-medium mt-1">{g.memberCount} people</p>
                            <p className={clsx("mt-4 text-lg font-bold", g.net >= 0 ? "text-[#007A64]" : "text-[#D93F3C]")}>
                               {g.net >= 0 ? '+' : '-'}${Math.abs(g.net).toFixed(2)}
                            </p>
                         </div>
                      </div>
                   ))}
                   {groupBalancesList.length === 0 && (
                      <div className="col-span-2 bg-white rounded-2xl p-5 border border-gray-200 text-sm text-gray-500 text-center">
                         No group balances.
                      </div>
                   )}
                </div>
             </section>

             <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
                <div className="flex justify-between items-start mb-8">
                   <div>
                      <h3 className="text-xl font-bold text-gray-900">Spending Trends</h3>
                      <p className="text-sm text-gray-500 mt-1">Your share of expenses over time</p>
                   </div>
                   <button className="flex items-center gap-1 bg-gray-100/80 text-gray-600 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors">
                      Last 6 Months <MSIcon name="expand_more" className="text-lg" />
                   </button>
                </div>
                
                <div className="h-56">
                   {monthlyChartData.length === 0 ? (
                      <div className="h-full flex items-center justify-center rounded-xl bg-gray-50 text-sm font-semibold text-gray-500">
                         No spending data yet.
                      </div>
                   ) : (
                      <ResponsiveContainer width="100%" height="100%">
                         <BarChart data={monthlyChartData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                            <CartesianGrid vertical={false} stroke="#F1F5F9" />
                            <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fill: '#64748B', fontSize: 12, fontWeight: 600 }} />
                            <YAxis tickLine={false} axisLine={false} tick={{ fill: '#94A3B8', fontSize: 11 }} tickFormatter={(value) => `$${value}`} />
                            <Tooltip formatter={(value) => [`$${Number(value).toFixed(2)}`, 'Spent']} cursor={{ fill: '#F8FAFC' }} />
                            <Bar dataKey="amount" fill="#007A64" radius={[4, 4, 0, 0]} maxBarSize={48} />
                         </BarChart>
                      </ResponsiveContainer>
                   )}
                </div>
             </div>

             {standingQuery.data && <NetPositionCard history={standingQuery.data.net_history} />}
             {standingQuery.data && <SettlementAgingCard aging={standingQuery.data.aging} users={users} currentUserId={currentUserId} />}
             {cashflowQuery.data && <CashflowForecastCard data={cashflowQuery.data} />}
          </div>

          <div className="hidden lg:flex w-full lg:w-[340px] shrink-0 flex-col gap-6">
             <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm flex flex-col">
                <div className="flex justify-between items-center mb-6">
                   <h3 className="text-lg font-bold text-gray-900">Balances by Group</h3>
                   <button className="text-gray-400 hover:text-gray-600 transition-colors"><MSIcon name="more_horiz" /></button>
                </div>
                <div className="space-y-6 flex-1">
                   {groupBalancesList.slice(0,3).map(g => (
                      <div key={g.id} className="flex items-center gap-4 group cursor-pointer">
                         <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center text-gray-500 shrink-0 group-hover:bg-[#EAF5F2] group-hover:text-[#007A64] transition-colors">
                            <MSIcon name="flight" />
                         </div>
                         <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-gray-900 truncate group-hover:text-[#007A64] transition-colors">{g.name}</h4>
                            <p className="text-[13px] text-gray-500">{g.memberCount} members</p>
                         </div>
                         <div className="text-right shrink-0">
                            {g.net > 0 && <><p className="font-bold text-[#007A64] text-sm">+${g.net.toFixed(2)}</p><p className="text-[11px] text-gray-500 font-medium">You are owed</p></>}
                            {g.net < 0 && <><p className="font-bold text-[#D93F3C] text-sm">-${Math.abs(g.net).toFixed(2)}</p><p className="text-[11px] text-gray-500 font-medium">You owe</p></>}
                            {g.net === 0 && <><p className="font-bold text-gray-400 text-sm">$0.00</p><p className="text-[11px] text-gray-400 font-medium">Settled</p></>}
                         </div>
                      </div>
                   ))}
                   {groupBalancesList.length === 0 && <p className="text-sm text-gray-500 text-center py-4">No group balances.</p>}
                </div>
                <button className="text-[#007A64] text-[11px] font-bold tracking-[0.1em] mt-8 hover:bg-[#EAF5F2] rounded-lg py-2 uppercase w-full text-center transition-colors">
                   View All Groups
                </button>
             </div>

             <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
                <h3 className="text-lg font-bold text-gray-900 mb-2">Top Categories</h3>
                <p className="text-xs font-semibold text-gray-500 mb-6">
                   {spendingAnalytics?.habits.transaction_count ?? 0} expenses · average ${(spendingAnalytics?.habits.average_transaction_cents ?? 0) / 100}
                </p>
                <div className="space-y-6">
                   {topCategories.map((category, index) => (
                      <div key={category.category} className="flex items-center gap-4">
                         <div className={clsx("w-9 h-9 rounded-full flex items-center justify-center shrink-0", index === 0 ? "bg-[#EAF5F2] text-[#007A64]" : index === 1 ? "bg-gray-100 text-gray-600" : "bg-red-50 text-[#D93F3C]")}>
                            <MSIcon name={category.category === 'Dining' ? 'restaurant' : category.category === 'Groceries' ? 'shopping_cart' : category.category === 'Transport' ? 'directions_car' : 'category'} className="text-[18px]" />
                         </div>
                         <div className="flex-1">
                            <div className="flex justify-between text-[13px] mb-1.5">
                               <span className="font-semibold text-gray-900">{category.category}</span>
                               <span className="text-gray-600 font-medium">${(category.amount_cents / 100).toFixed(2)}</span>
                            </div>
                            <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                               <div className={clsx("h-full rounded-full", index === 0 ? "bg-[#007A64]" : index === 1 ? "bg-gray-500" : "bg-[#D93F3C]")} style={{ width: `${Math.max(8, (category.amount_cents / maxCategoryAmount) * 100)}%` }} />
                            </div>
                         </div>
                      </div>
                   ))}
                   {topCategories.length === 0 && <p className="text-sm font-medium text-gray-500 text-center py-4">No category data yet.</p>}
                </div>
             </div>

             {receiptItemsQuery.data && <ReceiptItemsCard data={receiptItemsQuery.data} />}
             {groupAnalyticsQuery.data && <GroupHealthCard data={groupAnalyticsQuery.data} />}
             {predictionQuery.data && <SettlementPredictionCard data={predictionQuery.data} users={users} currentUserId={currentUserId} />}
             {shoppingQuery.data && <ShoppingInsightsCard data={shoppingQuery.data} />}
          </div>
       </div>
    );
}
