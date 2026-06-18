import React, { useState, useEffect } from 'react';
import clsx from 'clsx';
import MSIcon from './MSIcon';
import { avatarColor, initials } from '../lib/utils';
import { apiFetch } from '../lib/constants';

export default function GroupDetailView({ groupId, currentUserId, users, refreshTrigger, onRefresh, onAddExpense, onSelectExpense, onBack, onSettleUp }) {
  const [groupDetail, setGroupDetail] = useState(null);
  const [groupExpenses, setGroupExpenses] = useState([]);
  const [groupBalances, setGroupBalances] = useState([]);
  
  useEffect(() => {
    Promise.all([
      apiFetch(`/groups/${groupId}`).then(r => r.json()),
      apiFetch(`/groups/${groupId}/expenses`).then(r => r.json()),
      apiFetch(`/groups/${groupId}/balances`).then(r => r.json()),
    ]).then(([g, e, b]) => { setGroupDetail(g); setGroupExpenses(e); setGroupBalances(b); });
  }, [groupId, refreshTrigger]);

  if (!groupDetail) return <div className="flex items-center justify-center py-24 text-gray-500 font-semibold">Loading...</div>;

  const handleToggleSimplify = async () => {
    const newVal = !groupDetail.simplify_debts;
    try {
      await apiFetch(`/groups/${groupId}/simplify?enable=${newVal}`, {
        method: 'PUT'
      });
      setGroupDetail(prev => ({ ...prev, simplify_debts: newVal }));
    } catch (e) {
      console.error(e);
      // Revert on error
      setGroupDetail(prev => ({ ...prev, simplify_debts: !newVal }));
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
                className={clsx(
                    "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
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
               <h3 className="text-sm font-bold tracking-widest uppercase text-gray-500">Expenses</h3>
               <div className="flex items-center gap-2">
                  <button onClick={() => onSettleUp(groupDetail)} className="flex items-center gap-2 bg-[#FEE2E2] hover:bg-[#D93F3C] hover:text-white text-[#D93F3C] text-sm font-bold px-4 py-2 rounded-lg transition-colors active:scale-95">
                     <MSIcon name="payments" className="text-lg" /> Settle Up
                  </button>
                  <button onClick={() => onAddExpense(groupDetail)} className="flex items-center gap-2 bg-[#EAF5F2] hover:bg-[#007A64] hover:text-white text-[#007A64] text-sm font-bold px-4 py-2 rounded-lg transition-colors active:scale-95">
                     <MSIcon name="add" className="text-lg" /> Add
                  </button>
               </div>
            </div>
            {!groupExpenses.length
               ? <div className="flex flex-col items-center py-16 text-gray-400"><MSIcon name="receipt_long" className="text-5xl mb-3 opacity-30" /><p>No expenses yet.</p></div>
               : <div className="space-y-2">{groupExpenses.map(e => <ExpenseRow key={e.id} expense={e} currentUserId={currentUserId} onClick={() => onSelectExpense(e, groupDetail)} />)}</div>}
         </div>
         
         <div className="space-y-6">
            <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm h-fit">
               <h3 className="text-sm font-bold tracking-widest uppercase text-gray-500 mb-6">Members</h3>
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
                        
                        let text = '';
                        let amountColor = 'text-gray-900';
                        if (isMeFrom) {
                           text = `You owe ${toUser.name.split(' ')[0]}`;
                           amountColor = 'text-[#D93F3C]';
                        } else if (isMeTo) {
                           text = `${fromUser.name.split(' ')[0]} owes you`;
                           amountColor = 'text-[#007A64]';
                        } else {
                           text = `${fromUser.name.split(' ')[0]} owes ${toUser.name.split(' ')[0]}`;
                        }

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
                              {isMeFrom && (
                                 <button onClick={() => onSettleUp({ payeeId: b.to_user_id, amount: b.amount })} className="bg-[#007A64] text-white hover:bg-[#00604f] px-4 py-1.5 rounded-lg font-bold text-[11px] transition-colors shadow-sm ml-4">
                                    Settle Up
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

function ExpenseRow({ expense, currentUserId, onClick }) {
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
