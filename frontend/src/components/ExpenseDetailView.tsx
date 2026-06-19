import { Fragment } from 'react';
import clsx from 'clsx';
import MSIcon from './MSIcon';
import { avatarColor, initials } from '../lib/utils';
import { useExpenseAudit } from '../features/expenses/api';
import type { ExpenseWithCreator, User } from '../types/api';
import type { ExpenseSelectionContext } from '../types/ui';

interface ExpenseDetailViewProps {
   expense: ExpenseWithCreator;
   context: ExpenseSelectionContext;
   users: User[];
   currentUserId: number;
   onBack: () => void;
   onEdit: (expense: ExpenseWithCreator) => void;
}

export default function ExpenseDetailView({ expense, context, users, currentUserId, onBack, onEdit }: ExpenseDetailViewProps) {
   const auditQuery = useExpenseAudit(expense?.id);
   const auditLogs = auditQuery.data ?? [];

   const creator = users.find(u => u.id === expense.created_by) || { name: expense.creator_name || 'Someone' };
   const me = expense.participants.find(p => p.user_id === currentUserId);
   const myNet = (me?.amount_paid || 0) - (me?.amount_owed || 0);

   const formatMonth = (d: string) => new Date(d).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

   // Generate breadcrumbs based on context
   let breadcrumbs: string[];
   let backText: string;
   if (context?.from === 'group') {
      const groupName = context.groupName ?? 'Group';
      breadcrumbs = ['Groups', groupName, expense.description];
      backText = `Back to ${groupName}`;
   } else if (context?.from === 'preplanning') {
      breadcrumbs = ['Plans', context.planName || 'Plan Detail', expense.description];
      backText = "Back to Plan";
   } else {
      breadcrumbs = ['Activity', expense.description];
      backText = "Back to Activity";
   }

   // Identify who paid and who owes
   const payers = expense.participants.filter(p => p.amount_paid > 0);
   const payerStr = payers.length === 1 
      ? (payers[0].user_id === currentUserId ? 'You' : users.find(u => u.id === payers[0].user_id)?.name)
      : 'Multiple people';

   return (
      <div className="max-w-[1200px] mx-auto p-8 h-full overflow-y-auto">
         {/* Breadcrumb & Back */}
         <div className="flex items-center justify-between mb-8">
            <div className="flex flex-col gap-3">
               <div className="flex items-center gap-2 text-[13px] text-gray-500 font-medium">
                  {breadcrumbs.map((bc, i) => (
                     <Fragment key={bc}>
                        <span className={i === breadcrumbs.length - 1 ? "text-gray-900 font-bold" : ""}>{bc}</span>
                        {i < breadcrumbs.length - 1 && <MSIcon name="chevron_right" className="text-sm" />}
                     </Fragment>
                  ))}
               </div>
               <button onClick={onBack} className="flex items-center gap-2 text-gray-500 hover:text-gray-900 transition-colors font-bold text-sm w-fit active:scale-95">
                  <MSIcon name="arrow_back" className="text-lg" /> {backText}
               </button>
            </div>
         </div>

         {/* Header */}
         <div className="flex items-end justify-between mb-8">
            <h1 className="text-[40px] font-bold text-gray-900 leading-none tracking-tight">{expense.description}</h1>
            <div className="flex gap-3">
               <button className="flex items-center gap-2 px-5 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-lg text-sm font-bold hover:bg-gray-50 transition-colors shadow-sm">
                  <MSIcon name="delete" className="text-lg" /> Delete
               </button>
               <button onClick={() => onEdit(expense)} className="flex items-center gap-2 px-5 py-2.5 bg-[#007A64] text-white rounded-lg text-sm font-bold hover:bg-[#00604f] transition-colors shadow-sm">
                  <MSIcon name="edit" className="text-lg" /> Edit Expense
               </button>
            </div>
         </div>

         <div className="flex flex-col lg:flex-row gap-8">
            {/* Left Column */}
            <div className="flex-1 space-y-6">
               {/* High-level details box */}
               <div className="bg-white rounded-2xl border border-gray-200 shadow-sm flex overflow-hidden">
                  <div className="flex-1 p-8 border-r border-gray-100 flex flex-col justify-between space-y-8">
                     <div className="flex items-end gap-1">
                        <div>
                           <p className="text-[11px] font-bold tracking-widest uppercase text-gray-500 mb-2">Amount</p>
                           <h2 className="text-5xl font-bold text-[#007A64] flex items-baseline tracking-tight">
                              <span className="text-[28px] mr-1">$</span>
                              {expense.total_amount.toFixed(2)}
                           </h2>
                        </div>
                     </div>
                     <div className="flex gap-12">
                        <div>
                           <p className="text-[11px] font-bold tracking-widest uppercase text-gray-500 mb-2">Date</p>
                           <div className="flex items-center gap-2 text-gray-900 font-medium">
                              <MSIcon name="calendar_today" className="text-gray-400" />
                              {formatMonth(expense.date)}
                           </div>
                        </div>
                        <div>
                           <p className="text-[11px] font-bold tracking-widest uppercase text-gray-500 mb-2">Category</p>
                           <div className="flex items-center gap-2 text-gray-900 font-medium">
                              <MSIcon name="local_bar" className="text-[#007A64]" />
                              {expense.category || 'Entertainment / Drinks'}
                           </div>
                        </div>
                     </div>
                  </div>
                  <div className="w-[280px] bg-gray-50 p-8 flex flex-col items-center justify-center text-center">
                     <div className="w-16 h-16 rounded-full bg-[#EAF5F2] text-[#007A64] flex items-center justify-center shadow-sm mb-4">
                        <MSIcon name="person" className="text-3xl" />
                     </div>
                     <p className="text-sm text-gray-600 mb-1">Paid by</p>
                     <p className="font-bold text-gray-900 text-lg mb-2">{payerStr}</p>
                     {myNet > 0.005 && <p className="text-sm font-bold text-[#007A64]">You lent ${(myNet).toFixed(2)}</p>}
                     {myNet < -0.005 && <p className="text-sm font-bold text-[#D93F3C]">You owe ${Math.abs(myNet).toFixed(2)}</p>}
                     {Math.abs(myNet) <= 0.005 && <p className="text-sm font-bold text-gray-500">Not involved</p>}
                  </div>
               </div>

               {/* Splits & Shares */}
               <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
                     <h3 className="text-xs font-bold tracking-widest uppercase text-gray-500">Splits & Shares</h3>
                  </div>
                  <div className="divide-y divide-gray-100">
                     {expense.participants.map(p => {
                        const user = users.find(u => u.id === p.user_id) || { name: 'Unknown' };
                        const sharePct = ((p.amount_owed / expense.total_amount) * 100).toFixed(1);
                        return (
                           <div key={p.user_id} className="p-5 flex items-center justify-between hover:bg-gray-50 transition-colors">
                              <div className="flex items-center gap-4">
                                 <div className={clsx("w-11 h-11 rounded-full flex items-center justify-center font-bold text-white shadow-sm", avatarColor(p.user_id))}>
                                    {initials(user.name)}
                                 </div>
                                 <div>
                                    <p className="font-bold text-gray-900">{p.user_id === currentUserId ? 'You' : user.name}</p>
                                    {p.amount_paid > 0.005 && <p className="text-xs text-gray-500 italic mt-0.5">Paid ${p.amount_paid.toFixed(2)}</p>}
                                 </div>
                              </div>
                              <div className="text-right">
                                 <p className="font-bold text-gray-900 text-lg">${p.amount_owed.toFixed(2)}</p>
                                 <p className="text-[11px] text-gray-500 font-medium">Share: {sharePct}%</p>
                              </div>
                           </div>
                        );
                     })}
                  </div>
               </div>
            </div>

            {/* Right Column */}
            <div className="w-[380px] shrink-0 flex flex-col gap-6">
               {/* Receipt Block */}
               {expense.has_receipt ? (
                  <div className="bg-gray-900 rounded-2xl overflow-hidden relative shadow-md h-48 group">
                     <img src="https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&q=80&w=1000" alt="Receipt" className="w-full h-full object-cover opacity-60 group-hover:opacity-80 transition-opacity" />
                     <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                     <div className="absolute bottom-4 left-4 bg-black/50 backdrop-blur-md text-white text-[10px] font-bold tracking-widest uppercase px-3 py-1.5 rounded-md">
                        Receipt Attached
                     </div>
                  </div>
               ) : (
                  <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 flex flex-col items-center justify-center text-center h-48">
                     <MSIcon name="receipt_long" className="text-gray-300 text-5xl mb-3" />
                     <p className="text-sm font-bold text-gray-500">No Receipt Attached</p>
                     <p className="text-xs text-gray-400 mt-1">Edit this expense to upload one</p>
                  </div>
               )}

               {/* Activity History */}
               <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                  <div className="px-6 py-5 border-b border-gray-100">
                     <h3 className="text-xs font-bold tracking-widest uppercase text-gray-500">Activity History</h3>
                  </div>
                  <div className="p-6">
                     <div className="relative border-l-2 border-gray-100 ml-3 space-y-8 pb-4">
                        {auditLogs.length === 0 && (
                           <div className="relative pl-6">
                              <span className="absolute -left-[11px] top-1 w-5 h-5 rounded-full bg-[#EAF5F2] border-4 border-white flex items-center justify-center">
                                 <span className="w-1.5 h-1.5 bg-[#007A64] rounded-full" />
                              </span>
                              <p className="text-sm text-gray-900"><span className="font-bold">{creator.name === 'You' ? 'You' : creator.name}</span> created this expense</p>
                              <p className="text-[11px] text-gray-500 mt-1">{formatMonth(expense.date)}</p>
                           </div>
                        )}
                        {auditLogs.map((log, idx) => {
                           const u = users.find(usr => usr.id === log.user_id) || { name: 'Someone' };
                           const isYou = log.user_id === currentUserId;
                           const actionStr = log.action === 'CREATE' ? 'created this expense' : 'updated this expense';
                           return (
                              <div key={log.id} className="relative pl-6">
                                 <span className={clsx("absolute -left-[11px] top-1 w-5 h-5 rounded-full border-4 border-white flex items-center justify-center", idx === auditLogs.length - 1 ? "bg-[#EAF5F2]" : "bg-gray-200")}>
                                    <span className={clsx("w-1.5 h-1.5 rounded-full", idx === auditLogs.length - 1 ? "bg-[#007A64]" : "bg-gray-400")} />
                                 </span>
                                 <p className="text-sm text-gray-900"><span className="font-bold">{isYou ? 'You' : u.name}</span> {actionStr}</p>
                                 <p className="text-[11px] text-gray-500 mt-1">{new Date(log.timestamp).toLocaleDateString()} &bull; {new Date(log.timestamp).toLocaleTimeString()}</p>
                              </div>
                           );
                        })}
                     </div>
                     <button className="w-full text-center text-[11px] font-bold text-[#007A64] tracking-widest uppercase mt-4 hover:bg-[#EAF5F2] py-2 rounded-lg transition-colors">
                        View Full Log
                     </button>
                  </div>
               </div>

               {/* Settlement Status */}
               <div className="bg-[#EAF5F2] border border-[#c1e0d7] rounded-2xl p-6 shadow-sm">
                  <div className="flex items-center gap-2 mb-3">
                     <MSIcon name="info" className="text-[#007A64]" />
                     <h3 className="text-xs font-bold tracking-widest uppercase text-[#007A64]">Settlement Status</h3>
                  </div>
                  <p className="text-sm text-[#00604f] font-medium leading-snug mb-5">
                     There are still pending balances on this expense. You can send a reminder to those who haven't settled up.
                  </p>
                  <button className="w-full bg-white/60 hover:bg-white text-[#007A64] border border-[#c1e0d7] font-bold text-sm py-2.5 rounded-xl transition-colors shadow-sm">
                     SEND REMINDER
                  </button>
               </div>
            </div>
         </div>
      </div>
   );
}
