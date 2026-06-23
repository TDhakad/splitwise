import { useState } from 'react';
import clsx from 'clsx';
import { ExpenseActivityRow, SettlementActivityRow, GroupInviteActivityRow } from './ActivityRows';
import type { ExpenseWithCreator, GroupDetail, Settlement, User } from '../types/api';
import type { ActivityItem, ExpenseActivity, SettlementActivity } from '../types/ui';

type ActivityFilter = 'All' | 'Expenses' | 'Settlements' | 'Groups';

interface ActivityViewProps {
  expenses: ExpenseWithCreator[];
  settlements: Settlement[];
  groups: GroupDetail[];
  users: User[];
  currentUserId: number;
  onSelectExpense: (expense: ExpenseWithCreator) => void;
}

export default function ActivityView({ expenses, settlements, groups, users, currentUserId, onSelectExpense }: ActivityViewProps) {
  const [filter, setFilter] = useState<ActivityFilter>('All');
  const [visibleCount, setVisibleCount] = useState(25);

  const handleFilterChange = (nextFilter: ActivityFilter) => {
    setFilter(nextFilter);
    setVisibleCount(25);
  };
  
  const expenseActivities: ExpenseActivity[] = expenses.map(e => {
     const me = e.participants?.find(p => p.user_id === currentUserId);
     const net = (me?.amount_paid ?? 0) - (me?.amount_owed ?? 0);
     const creator = users.find(u => u.id === e.created_by) || { name: 'Someone', id: e.created_by };
     const group = groups.find(g => g.id === e.group_id);
     
     const dateObj = new Date(e.date);
     
     return {
        id: `exp-${e.id}`,
        expenseObj: e,
        type: 'expense' as const,
        date: dateObj,
        user_id: creator.id,
        userName: creator.id === currentUserId ? 'You' : creator.name,
        action: 'added',
        item: e.description,
        groupName: group?.name,
        net: net,
        icon: 'receipt_long',
        timeAgo: dateObj.toLocaleDateString(),
        badgeColor: 'bg-[#007A64]'
     };
  });

  const settlementActivities: SettlementActivity[] = settlements.map(s => {
     const payer = users.find(u => u.id === s.payer_id) || { name: 'Someone', id: s.payer_id };
     const payee = users.find(u => u.id === s.payee_id) || { name: 'someone', id: s.payee_id };
     const group = groups.find(g => g.id === s.group_id);
     const dateObj = new Date(s.date);
     const payerName = payer.id === currentUserId ? 'You' : payer.name;
     const payeeName = payee.id === currentUserId ? 'you' : payee.name;

     return {
        id: `settlement-${s.id}`,
        type: 'settlement' as const,
        date: dateObj,
        user_id: payer.id,
        userName: payerName,
        action: `paid ${payeeName}`,
        groupName: group?.name,
        amount: s.amount,
        icon: 'payments',
        timeAgo: dateObj.toLocaleDateString(),
        badgeColor: 'bg-[#007A64]'
     };
  });

  const activities: ActivityItem[] = [...expenseActivities, ...settlementActivities];

  const filtered = activities.filter(a => {
    if (filter === 'Expenses') return a.type === 'expense';
    if (filter === 'Settlements') return a.type === 'settlement';
    if (filter === 'Groups') return a.type === 'group_invite';
    return true;
  });

  filtered.sort((a, b) => b.date.getTime() - a.date.getTime());
  const visibleActivities = filtered.slice(0, visibleCount);

  const todayStr = new Date().toDateString();
  const yesterdayDate = new Date();
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterdayStr = yesterdayDate.toDateString();

  const grouped: Record<string, ActivityItem[]> = {};
  visibleActivities.forEach(a => {
     const dStr = a.date.toDateString();
     let label: string;
     if (dStr === todayStr) label = 'Today';
     else if (dStr === yesterdayStr) label = 'Yesterday';
     else label = a.date.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
     
     if (!grouped[label]) grouped[label] = [];
     grouped[label].push(a);
  });

  // Maintain order of groups
  const groupOrder = Array.from(new Set(visibleActivities.map(a => {
     const dStr = a.date.toDateString();
     if (dStr === todayStr) return 'Today';
     if (dStr === yesterdayStr) return 'Yesterday';
     return a.date.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  })));

  const renderRow = (activity: ActivityItem) => {
     if (activity.type === 'expense') {
        return <ExpenseActivityRow key={activity.id} activity={activity} currentUserId={currentUserId} onClick={() => onSelectExpense(activity.expenseObj)} />;
     }
     if (activity.type === 'settlement') return <SettlementActivityRow key={activity.id} activity={activity} />;
     if (activity.type === 'group_invite') return <GroupInviteActivityRow key={activity.id} activity={activity} />;
     return null;
  };

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8 h-full overflow-y-auto">
      <div className="mb-8 sm:mb-10">
        <h2 className="text-[40px] sm:text-[28px] font-bold text-gray-900 mb-2">
          <span className="sm:hidden">Activity</span>
          <span className="hidden sm:inline">Recent Activity</span>
        </h2>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
           <p className="text-gray-600 font-medium">Track your shared expenses and group interactions.</p>
           <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
              {(['All', 'Expenses', 'Settlements', 'Groups'] as ActivityFilter[]).map(f => (
                 <button key={f} onClick={() => handleFilterChange(f)} className={clsx("px-4 py-1.5 rounded-full text-sm font-bold transition-colors border", filter === f ? "bg-gray-200 border-gray-200 text-gray-900" : "bg-white border-gray-300 text-gray-600 hover:bg-gray-50")}>
                    {f}
                 </button>
              ))}
           </div>
        </div>
      </div>

      <div className="space-y-8">
        {groupOrder.length === 0 && <p className="text-gray-500 text-center py-10">No activity found.</p>}
        {groupOrder.map(label => (
          <section key={label}>
             <h3 className="flex items-center gap-4 text-xs font-bold tracking-widest uppercase text-gray-900 mb-4 ml-1">
                <span>{label}</span>
                <span className="sm:hidden h-px bg-gray-200 flex-1" />
             </h3>
             <div className="sm:bg-white sm:rounded-2xl sm:border sm:border-gray-200 sm:shadow-sm sm:overflow-hidden sm:divide-y sm:divide-gray-100">
                {grouped[label].map(renderRow)}
             </div>
          </section>
        ))}
      </div>

      {visibleCount < filtered.length && (
         <div className="mt-8 flex justify-center pb-12">
            <button onClick={() => setVisibleCount(count => count + 25)} className="px-6 py-2.5 bg-white border border-gray-300 rounded-full text-sm font-bold text-gray-700 hover:bg-gray-50 transition-colors shadow-sm">
               Load More Activity
            </button>
         </div>
      )}
    </div>
  );
}
