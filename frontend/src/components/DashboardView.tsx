import clsx from 'clsx';
import MSIcon from './MSIcon';
import { initials } from '../lib/utils';
import type { DashboardProps } from '../types/ui';

export default function DashboardView({ balances, rawBalances, groups, users, currentUserId }: DashboardProps) {
    const netBalance = balances.net_balance || 0;
    const totalOwedToMe = balances.total_owed || 0;
    const totalIOwe = balances.total_owes || 0;

    const friendsSet = new Set<number>();
    rawBalances.forEach(b => {
       if (b.from_user_id === currentUserId) friendsSet.add(b.to_user_id);
       if (b.to_user_id === currentUserId) friendsSet.add(b.from_user_id);
    });

    const groupBalancesMap: Record<number, number> = {};
    rawBalances.forEach(b => {
       if (b.group_id) {
          if (!groupBalancesMap[b.group_id]) groupBalancesMap[b.group_id] = 0;
          if (b.from_user_id === currentUserId) groupBalancesMap[b.group_id] -= b.amount;
          if (b.to_user_id === currentUserId) groupBalancesMap[b.group_id] += b.amount;
       }
    });

    const groupBalancesList = groups.map(g => ({
       id: g.id,
       name: g.name,
       memberCount: g.members?.length || 0,
       net: groupBalancesMap[g.id] || 0
    }));

    return (
       <div className="flex flex-col lg:flex-row gap-8 max-w-[1400px] mx-auto p-8 h-full overflow-y-auto">
          <div className="flex-1 space-y-6">
             <div className="bg-[#EAF5F2] rounded-2xl p-8 border border-[#c1e0d7] shadow-sm relative overflow-hidden">
                <div className="absolute right-0 bottom-0 opacity-10 pointer-events-none">
                    <MSIcon name="account_balance" style={{ fontSize: 200 }} className="translate-x-12 translate-y-12" />
                </div>
                <p className="text-[11px] font-bold text-gray-700 tracking-[0.1em] mb-3 uppercase">Total Net Balance</p>
                <h2 className={clsx("text-5xl font-bold mb-3 tracking-tight", netBalance >= 0 ? "text-[#007A64]" : "text-red-600")}>
                   {netBalance >= 0 ? '+ ' : '- '}${Math.abs(netBalance).toFixed(2)}
                </h2>
                <p className="text-sm text-gray-600 font-medium">Across {groups.length} groups and {friendsSet.size} friends</p>
             </div>

             <div className="flex flex-col sm:flex-row gap-6">
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
                
                <div className="h-48 relative border-b border-gray-100 pb-6 mb-2">
                   <div className="absolute left-0 top-0 bottom-6 w-8 flex flex-col justify-between text-[10px] text-gray-400 font-medium">
                      <span>$1k</span>
                      <span>$500</span>
                      <span>$0</span>
                   </div>
                   <div className="ml-10 h-full flex items-end justify-between gap-4">
                      {[
                         { m: 'Jan', v: 35 }, { m: 'Feb', v: 45 }, { m: 'Mar', v: 40 },
                         { m: 'Apr', v: 60 }, { m: 'May', v: 30 }, { m: 'Jun', v: 75 }
                      ].map(d => (
                         <div key={d.m} className="flex flex-col items-center flex-1 h-full justify-end relative group">
                            <div className="w-full max-w-[48px] bg-[#AECFC6] group-hover:bg-[#8ABBAF] rounded-t-sm transition-all" style={{ height: `${d.v}%` }} />
                            {d.m === 'Jun' && <div className="absolute bottom-0 w-full max-w-[48px] bg-[#007A64] rounded-t-sm transition-all shadow-md" style={{ height: `${d.v}%` }} />}
                            <span className={clsx("absolute -bottom-6 text-xs font-medium", d.m === 'Jun' ? "text-[#007A64] font-bold" : "text-gray-500")}>{d.m}</span>
                         </div>
                      ))}
                   </div>
                </div>
             </div>
          </div>

          <div className="w-full lg:w-[340px] shrink-0 flex flex-col gap-6">
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
                <h3 className="text-lg font-bold text-gray-900 mb-6">Top Categories</h3>
                <div className="space-y-6">
                   <div className="flex items-center gap-4">
                      <div className="w-9 h-9 rounded-full bg-[#EAF5F2] text-[#007A64] flex items-center justify-center shrink-0"><MSIcon name="restaurant" className="text-[18px]" /></div>
                      <div className="flex-1">
                         <div className="flex justify-between text-[13px] mb-1.5"><span className="font-semibold text-gray-900">Dining Out</span><span className="text-gray-600 font-medium">$450</span></div>
                         <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden"><div className="h-full bg-[#007A64] rounded-full w-[70%]" /></div>
                      </div>
                   </div>
                   <div className="flex items-center gap-4">
                      <div className="w-9 h-9 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center shrink-0"><MSIcon name="shopping_cart" className="text-[18px]" /></div>
                      <div className="flex-1">
                         <div className="flex justify-between text-[13px] mb-1.5"><span className="font-semibold text-gray-900">Groceries</span><span className="text-gray-600 font-medium">$280</span></div>
                         <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden"><div className="h-full bg-gray-500 rounded-full w-[45%]" /></div>
                      </div>
                   </div>
                   <div className="flex items-center gap-4">
                      <div className="w-9 h-9 rounded-full bg-red-50 text-[#D93F3C] flex items-center justify-center shrink-0"><MSIcon name="flight" className="text-[18px]" /></div>
                      <div className="flex-1">
                         <div className="flex justify-between text-[13px] mb-1.5"><span className="font-semibold text-gray-900">Travel</span><span className="text-gray-600 font-medium">$150</span></div>
                         <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden"><div className="h-full bg-[#D93F3C] rounded-full w-[25%]" /></div>
                      </div>
                   </div>
                </div>
             </div>
          </div>
       </div>
    );
}
