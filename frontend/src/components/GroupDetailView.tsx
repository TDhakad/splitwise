import { useState } from 'react';
import clsx from 'clsx';
import MSIcon from './MSIcon';
import { avatarColor, initials } from '../lib/utils';
import LoadingState from './ui/LoadingState';
import ErrorState from './ui/ErrorState';
import useDebouncedValue from '../hooks/useDebouncedValue';
import { getErrorMessage } from '../lib/constants';
import {
  useAddGroupMember,
  useGroup,
  useGroupBalances,
  useGroupExpenses,
  useGroupSettlements,
  useUpdateGroupSimplify,
} from '../features/groups/api';
import type { ExpenseWithCreator, GroupDetail, Settlement, User } from '../types/api';
import type { SettleUpContext } from '../types/ui';

type GroupTransaction =
  | { type: 'expense'; date: string; data: ExpenseWithCreator }
  | { type: 'settlement'; date: string; data: Settlement };

interface GroupDetailViewProps {
  groupId: number;
  currentUserId: number;
  users: User[];
  onAddExpense: (group: GroupDetail) => void;
  onSelectExpense: (expense: ExpenseWithCreator, group: GroupDetail) => void;
  onBack: () => void;
  onSettleUp: (options: SettleUpContext) => void;
}

export default function GroupDetailView({ groupId, currentUserId, users, onAddExpense, onSelectExpense, onBack, onSettleUp }: GroupDetailViewProps) {
  const [showAddMember, setShowAddMember] = useState(false);
  const [memberQuery, setMemberQuery] = useState('');
  const [memberError, setMemberError] = useState('');
  const debouncedMemberQuery = useDebouncedValue(memberQuery);

  const groupQuery = useGroup(groupId);
  const expensesQuery = useGroupExpenses(groupId);
  const settlementsQuery = useGroupSettlements(groupId);
  const balancesQuery = useGroupBalances(groupId);
  const updateSimplify = useUpdateGroupSimplify(groupId, currentUserId);
  const addMember = useAddGroupMember(groupId);

  if (groupQuery.isPending || expensesQuery.isPending || settlementsQuery.isPending || balancesQuery.isPending) {
    return <LoadingState label="Loading group..." />;
  }

  const loadError = [groupQuery, expensesQuery, settlementsQuery, balancesQuery].find(query => query.isError);
  if (loadError) {
    return <ErrorState title="Unable to load group" message={loadError.error.message} />;
  }

  const groupDetail = groupQuery.data;
  if (!groupDetail) {
    return <ErrorState title="Unable to load group" message="Group details were not returned." />;
  }

  const groupExpenses = expensesQuery.data ?? [];
  const groupSettlements = settlementsQuery.data ?? [];
  const groupBalances = balancesQuery.data ?? [];

  const handleToggleSimplify = async () => {
    if (updateSimplify.isPending) return;
    const newVal = !groupDetail.simplify_debts;

    try {
      await updateSimplify.mutateAsync(newVal);
    } catch (e) {
      console.error(e);
    }
  };

  const transactions: GroupTransaction[] = [
    ...groupExpenses.map(expense => ({ type: 'expense' as const, date: expense.date, data: expense })),
    ...groupSettlements.map(settlement => ({ type: 'settlement' as const, date: settlement.date, data: settlement })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const groupMemberIds = new Set(groupDetail.members.map(m => m.id));
  const addableMembers = users.filter(u =>
    !groupMemberIds.has(u.id) &&
    (u.name.toLowerCase().includes(debouncedMemberQuery.toLowerCase()) ||
      (u.email ?? '').toLowerCase().includes(debouncedMemberQuery.toLowerCase()))
  );

  const handleAddMember = async (user: User) => {
    if (addMember.isPending) return;
    setMemberError('');

    try {
      await addMember.mutateAsync(user.id);
      setShowAddMember(false);
      setMemberQuery('');
    } catch (e) {
      setMemberError(getErrorMessage(e));
    }
  };

  return (
    <div className="max-w-[1000px] mx-auto p-8 h-full overflow-y-auto space-y-6">
      <button onClick={onBack} className="flex items-center gap-2 text-gray-500 hover:text-gray-900 transition-colors font-semibold text-sm mb-4">
         <MSIcon name="arrow_back" className="text-lg" /> Back to Groups
      </button>
      
      <div className="bg-white border border-gray-200 rounded-2xl p-8 shadow-sm flex items-center justify-between">
         <div className="flex items-center gap-5">
            <div className="w-16 h-16 bg-[#F3F4F6] rounded-xl flex items-center justify-center text-[#007A64]">
                <MSIcon name="group" className="text-3xl" />
            </div>
            <div>
               <h2 className="text-3xl font-bold text-gray-900">{groupDetail.name}</h2>
               {groupDetail.description && <p className="text-gray-500 mt-1">{groupDetail.description}</p>}
            </div>
         </div>
         
         <div className="flex items-center gap-3">
            <span className="text-sm font-bold text-gray-500">Simplify Debts</span>
            <button 
                onClick={handleToggleSimplify}
                disabled={updateSimplify.isPending}
                className={clsx(
                    "relative inline-flex h-6 w-11 items-center rounded-full transition-colors disabled:opacity-70",
                    groupDetail.simplify_debts ? "bg-[#007A64]" : "bg-gray-200"
                )}
            >
                <span className={clsx(
                    "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                    groupDetail.simplify_debts ? "translate-x-6" : "translate-x-1"
                )} />
            </button>
         </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
         <div className="md:col-span-2 bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
            <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-100">
               <h3 className="text-sm font-bold tracking-widest uppercase text-gray-500">Transactions</h3>
               <div className="flex items-center gap-2">
                  <button onClick={() => onAddExpense(groupDetail)} className="flex items-center gap-2 bg-[#EAF5F2] hover:bg-[#007A64] hover:text-white text-[#007A64] text-sm font-bold px-4 py-2 rounded-lg transition-colors active:scale-95">
                     <MSIcon name="add" className="text-lg" /> Add
                  </button>
               </div>
            </div>
            {!transactions.length
               ? <div className="flex flex-col items-center py-16 text-gray-400"><MSIcon name="receipt_long" className="text-5xl mb-3 opacity-30" /><p>No transactions yet.</p></div>
               : <div className="space-y-2">
                  {transactions.map(t => (
                     t.type === 'expense'
                        ? <ExpenseRow key={`expense-${t.data.id}`} expense={t.data} currentUserId={currentUserId} onClick={() => onSelectExpense(t.data, groupDetail)} />
                        : <SettlementRow key={`settlement-${t.data.id}`} settlement={t.data} users={users} currentUserId={currentUserId} />
                  ))}
               </div>}
         </div>
         
         <div className="space-y-6">
            <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm h-fit">
               <div className="flex items-center justify-between mb-6">
                  <h3 className="text-sm font-bold tracking-widest uppercase text-gray-500">Members</h3>
                  <button onClick={() => { setShowAddMember(prev => !prev); setMemberError(''); }} className="w-8 h-8 rounded-lg bg-[#EAF5F2] text-[#007A64] hover:bg-[#007A64] hover:text-white flex items-center justify-center transition-colors">
                     <MSIcon name={showAddMember ? "close" : "person_add"} className="text-lg" />
                  </button>
               </div>
               {showAddMember && (
                  <div className="mb-5 rounded-xl border border-gray-200 bg-gray-50 p-3">
                     <div className="relative mb-3">
                        <MSIcon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg" />
                        <input
                           type="text"
                           value={memberQuery}
                           onChange={e => setMemberQuery(e.target.value)}
                           placeholder="Search friends"
                           className="w-full h-10 rounded-lg border border-gray-200 bg-white pl-10 pr-3 text-sm font-medium text-gray-900 placeholder:text-gray-400 outline-none focus:border-[#007A64] focus:ring-2 focus:ring-[#007A64]/10"
                        />
                     </div>
                     <div className="max-h-52 overflow-y-auto space-y-1">
                        {addableMembers.map(user => (
                           <button key={user.id} onClick={() => handleAddMember(user)} disabled={addMember.isPending} className="w-full flex items-center gap-3 rounded-lg px-2 py-2 text-left hover:bg-white disabled:opacity-60 transition-colors">
                              <div className={clsx('w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold shadow-sm border-2 border-white', avatarColor(user.id))}>
                                 {initials(user.name)}
                              </div>
                              <div className="min-w-0 flex-1">
                                 <p className="truncate text-sm font-bold text-gray-900">{user.name}</p>
                                 <p className="truncate text-xs text-gray-500">{user.email}</p>
                              </div>
                              {addMember.isPending && addMember.variables === user.id ? <MSIcon name="refresh" className="animate-spin text-[#007A64]" /> : <MSIcon name="add" className="text-[#007A64]" />}
                           </button>
                        ))}
                        {addableMembers.length === 0 && (
                           <p className="px-2 py-4 text-center text-xs font-semibold text-gray-500">No available friends</p>
                        )}
                     </div>
                     {memberError && <p className="mt-3 text-xs font-bold text-[#D93F3C]">{memberError}</p>}
                  </div>
               )}
               <div className="space-y-4">
                  {groupDetail.members.map(m => (
                     <div key={m.id} className="flex items-center gap-3">
                        <div className={clsx('w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold shadow-sm border-2 border-white', avatarColor(m.id))}>
                           {initials(m.name)}
                        </div>
                        <div>
                           <span className="text-sm font-bold text-gray-900">{m.id === currentUserId ? 'You' : m.name}</span>
                           <p className="text-xs text-gray-500">{m.email}</p>
                        </div>
                     </div>
                  ))}
               </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm h-fit">
               <h3 className="text-sm font-bold tracking-widest uppercase text-gray-500 mb-6">Group Balances</h3>
               {!groupBalances.length ? (
                  <p className="text-sm text-gray-500 italic">Everyone is settled up.</p>
               ) : (
                  <div className="space-y-4">
                     {groupBalances.map(b => {
                        const fromUser = users.find(u => u.id === b.from_user_id) || { name: 'Unknown' };
                        const toUser = users.find(u => u.id === b.to_user_id) || { name: 'Unknown' };
                        
                        const isMeFrom = b.from_user_id === currentUserId;
                        const isMeTo = b.to_user_id === currentUserId;
                        
                        const text = isMeFrom
                           ? `You owe ${toUser.name.split(' ')[0]}`
                           : isMeTo
                              ? `${fromUser.name.split(' ')[0]} owes you`
                              : `${fromUser.name.split(' ')[0]} owes ${toUser.name.split(' ')[0]}`;
                        const amountColor = isMeFrom ? 'text-[#D93F3C]' : isMeTo ? 'text-[#007A64]' : 'text-gray-900';

                        return (
                           <div key={`${b.from_user_id}-${b.to_user_id}`} className="flex items-center justify-between group-balance-row py-2 border-b border-gray-50 last:border-0">
                              <div className="flex items-center gap-3">
                                 <div className="relative w-8 h-8 flex shrink-0">
                                    <div className={clsx('w-6 h-6 rounded-full flex items-center justify-center text-[8px] font-bold shadow-sm border-2 border-white absolute top-0 left-0 z-10', avatarColor(b.from_user_id))}>
                                       {initials(fromUser.name)}
                                    </div>
                                    <div className={clsx('w-6 h-6 rounded-full flex items-center justify-center text-[8px] font-bold shadow-sm border-2 border-white absolute bottom-0 right-0 z-0', avatarColor(b.to_user_id))}>
                                       {initials(toUser.name)}
                                    </div>
                                 </div>
                                 <div>
                                    <p className="text-[13px] font-medium text-gray-700 leading-tight">{text}</p>
                                    <p className={clsx("text-sm font-bold", amountColor)}>${b.amount.toFixed(2)}</p>
                                 </div>
                              </div>
                              {(isMeFrom || isMeTo) && (
                                 <button onClick={() => onSettleUp({ payerId: b.from_user_id, payeeId: b.to_user_id, amount: b.amount, maxAmount: b.amount })} className="bg-[#007A64] text-white hover:bg-[#00604f] px-4 py-1.5 rounded-lg font-bold text-[11px] transition-colors shadow-sm ml-4">
                                    {isMeFrom ? 'Settle Up' : 'Record Payment'}
                                 </button>
                              )}
                           </div>
                        );
                     })}
                  </div>
               )}
            </div>
         </div>
      </div>
    </div>
  );
}

interface SettlementRowProps {
  settlement: Settlement;
  users: User[];
  currentUserId: number;
}

function SettlementRow({ settlement, users, currentUserId }: SettlementRowProps) {
  const payer = users.find(u => u.id === settlement.payer_id) || { name: 'Someone' };
  const payee = users.find(u => u.id === settlement.payee_id) || { name: 'someone' };
  const date = new Date(settlement.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const payerName = settlement.payer_id === currentUserId ? 'You' : payer.name;
  const payeeName = settlement.payee_id === currentUserId ? 'you' : payee.name;

  return (
    <div className="flex items-center justify-between p-4 border border-transparent rounded-xl">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-[#EAF5F2] flex items-center justify-center transition-colors shadow-sm">
          <MSIcon name="payments" className="text-[#007A64] text-xl" />
        </div>
        <div>
          <p className="font-bold text-gray-900 text-sm">{payerName} paid {payeeName}</p>
          <p className="text-[12px] font-medium text-gray-500 mt-0.5">{date}</p>
        </div>
      </div>
      <div className="text-right shrink-0 ml-4">
        <p className="text-[10px] font-bold tracking-widest uppercase text-[#007A64]">settled</p>
        <p className="font-bold text-[#007A64]">${settlement.amount.toFixed(2)}</p>
      </div>
    </div>
  );
}

interface ExpenseRowProps {
  expense: ExpenseWithCreator;
  currentUserId: number;
  onClick: () => void;
}

function ExpenseRow({ expense, currentUserId, onClick }: ExpenseRowProps) {
  const me = expense.participants?.find(p => p.user_id === currentUserId);
  const net = (me?.amount_paid ?? 0) - (me?.amount_owed ?? 0);
  const isPos = net > 0.005, isNeg = net < -0.005;
  const date = new Date(expense.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return (
    <div onClick={onClick} className="flex items-center justify-between p-4 hover:bg-[#F8F9FA] border border-transparent hover:border-gray-100 rounded-xl transition-all cursor-pointer group">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-gray-100 group-hover:bg-white flex items-center justify-center transition-colors shadow-sm"><MSIcon name="receipt_long" className="text-gray-500 text-xl" /></div>
        <div>
          <p className="font-bold text-gray-900 text-sm">{expense.description}</p>
          <p className="text-[12px] font-medium text-gray-500 mt-0.5">{date}</p>
        </div>
      </div>
      <div className="text-right shrink-0 ml-4">
        {isPos && <><p className="text-[10px] font-bold tracking-widest uppercase text-gray-500">you lent</p><p className="font-bold text-[#007A64]">+${net.toFixed(2)}</p></>}
        {isNeg && <><p className="text-[10px] font-bold tracking-widest uppercase text-gray-500">you owe</p><p className="font-bold text-[#D93F3C]">-${Math.abs(net).toFixed(2)}</p></>}
        {!isPos && !isNeg && <><p className="text-[10px] font-bold tracking-widest uppercase text-gray-500">settled</p><p className="font-bold text-gray-500">${expense.total_amount.toFixed(2)}</p></>}
      </div>
    </div>
  );
}
