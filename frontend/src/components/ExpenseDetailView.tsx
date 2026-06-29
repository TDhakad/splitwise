import { Fragment, useState } from 'react';
import clsx from 'clsx';
import MSIcon from './MSIcon';
import ExpenseDeleteDialog from './ExpenseDeleteDialog';
import ItemizedSplitStep from './ItemizedSplitStep';
import ReceiptBreakdownCard from './ReceiptBreakdownCard';
import { avatarColor, initials } from '../lib/utils';
import { useExpenseAudit, useUpdateExpense } from '../features/expenses/api';
import type { ExpenseCategory, ExpenseCreate, ExpenseParticipantBase, ExpenseWithCreator, ReceiptBreakdown, User } from '../types/api';
import type { BooleanById, ExpenseSelectionContext, ReceiptReviewData } from '../types/ui';

interface ExpenseDetailViewProps {
   expense: ExpenseWithCreator;
   context: ExpenseSelectionContext;
   users: User[];
   currentUserId: number;
   onBack: () => void;
   onEdit: (expense: ExpenseWithCreator) => void;
   onDeleted: () => void;
}

export default function ExpenseDetailView({ expense, context, users, currentUserId, onBack, onEdit, onDeleted }: ExpenseDetailViewProps) {
   const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
   const [showReceiptSplitEditor, setShowReceiptSplitEditor] = useState(false);
   const [receiptEditorData, setReceiptEditorData] = useState<ReceiptReviewData | null>(null);
   const auditQuery = useExpenseAudit(expense?.id);
   const updateExpense = useUpdateExpense();
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
   } else if (context?.from === 'friend') {
      const friendName = context.friendName ?? 'Friend';
      breadcrumbs = ['Friends', friendName, context.contextName ?? 'Ledger', expense.description];
      backText = `Back to ${friendName}`;
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
   const payerId = payers[0]?.user_id ?? currentUserId;
   const receiptData = expense.receipt_breakdown ? receiptBreakdownToReviewData(expense.receipt_breakdown) : null;
   const involvedUsers = expense.receipt_breakdown ? receiptBreakdownToInvolvedUsers(expense.receipt_breakdown) : {};

   const openReceiptSplitEditor = () => {
      setReceiptEditorData(receiptData);
      setShowReceiptSplitEditor(true);
   };

   const handleSaveReceiptSplit = async (participants: ExpenseParticipantBase[], finalTotal: number, receiptBreakdown: ReceiptBreakdown) => {
      const payload: ExpenseCreate = {
         group_id: expense.group_id,
         plan_id: expense.plan_id ?? null,
         description: expense.description,
         total_amount: finalTotal,
         currency: 'USD',
         date: expense.date,
         category: toExpenseCategory(expense.category),
         has_receipt: true,
         receipt_breakdown: receiptBreakdown,
         participants,
      };

      await updateExpense.mutateAsync({ expenseId: expense.id, currentUserId, payload });
      setShowReceiptSplitEditor(false);
      setReceiptEditorData(null);
   };

   return (
      <div className="max-w-[1200px] mx-auto p-4 sm:p-6 lg:p-8 h-full overflow-y-auto">
         <div className="sm:hidden sticky top-0 -mx-4 -mt-4 mb-6 px-4 py-4 bg-white/95 backdrop-blur-md border-b border-gray-200 z-20 flex items-center justify-between">
            <button onClick={onBack} className="w-11 h-11 rounded-full flex items-center justify-center text-gray-700 hover:bg-gray-100 active:scale-95 transition-all" aria-label={backText}>
               <MSIcon name="arrow_back" className="text-2xl" />
            </button>
            <h1 className="font-bold text-xl text-gray-900 truncate px-3">{expense.description}</h1>
            <div className="flex items-center gap-1">
               {!expense.is_deleted && (
                  <>
                     <button onClick={() => onEdit(expense)} className="w-11 h-11 rounded-full flex items-center justify-center text-gray-700 hover:bg-gray-100 active:scale-95 transition-all" aria-label="Edit expense">
                        <MSIcon name="edit" />
                     </button>
                     <button onClick={() => setShowDeleteConfirm(true)} className="w-11 h-11 rounded-full flex items-center justify-center text-gray-700 hover:bg-gray-100 active:scale-95 transition-all" aria-label="Delete expense">
                        <MSIcon name="delete" />
                     </button>
                  </>
               )}
            </div>
         </div>

         {/* Breadcrumb & Back */}
         <div className="hidden sm:flex items-center justify-between mb-8">
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
         <div className="hidden sm:flex items-end justify-between mb-8">
            <h1 className="text-[40px] font-bold text-gray-900 leading-none tracking-tight">{expense.description}</h1>
            <div className="flex gap-3">
               {!expense.is_deleted && (
                  <>
                     <button onClick={() => setShowDeleteConfirm(true)} className="flex items-center gap-2 px-5 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-lg text-sm font-bold hover:bg-gray-50 transition-colors shadow-sm">
                        <MSIcon name="delete" className="text-lg" /> Delete
                     </button>
                     <button onClick={() => onEdit(expense)} className="flex items-center gap-2 px-5 py-2.5 bg-[#007A64] text-white rounded-lg text-sm font-bold hover:bg-[#00604f] transition-colors shadow-sm">
                        <MSIcon name="edit" className="text-lg" /> Edit Expense
                     </button>
                  </>
               )}
            </div>
         </div>

         <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
            {/* Left Column */}
            <div className="flex-1 space-y-6">
               {expense.is_deleted && (
                  <div className="bg-red-50 text-red-800 px-4 py-3 rounded-xl font-medium border border-red-200 flex items-center gap-2">
                     <MSIcon name="info" className="text-red-500" />
                     This expense was deleted.
                  </div>
               )}
               {/* High-level details box */}
               <div className="bg-white rounded-3xl sm:rounded-2xl border border-gray-200 shadow-sm flex flex-col sm:flex-row overflow-hidden">
                  <div className="flex-1 p-6 sm:p-8 border-b sm:border-b-0 sm:border-r border-gray-100 flex flex-col justify-between space-y-8">
                     <div className="flex items-end justify-center sm:justify-start gap-1 text-center sm:text-left">
                        <div>
                           <p className="text-[11px] font-bold tracking-widest uppercase text-gray-500 mb-2 sm:block hidden">Amount</p>
                           <h2 className="text-6xl sm:text-5xl font-bold text-[#007A64] flex items-baseline justify-center sm:justify-start tracking-tight">
                              <span className="text-[28px] mr-1">$</span>
                              {expense.total_amount.toFixed(2)}
                           </h2>
                           <p className="sm:hidden mt-4 text-sm font-bold text-gray-600">Paid by {payerStr}</p>
                           {myNet > 0.005 && <p className="sm:hidden text-sm font-bold text-[#007A64] mt-1">You lent ${(myNet).toFixed(2)}</p>}
                           {myNet < -0.005 && <p className="sm:hidden text-sm font-bold text-[#D93F3C] mt-1">You owe ${Math.abs(myNet).toFixed(2)}</p>}
                        </div>
                     </div>
                     <div className="grid grid-cols-2 sm:flex gap-4 sm:gap-12">
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
                  <div className="hidden sm:flex w-[280px] bg-gray-50 p-8 flex-col items-center justify-center text-center">
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
               <div className="bg-white rounded-3xl sm:rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
                     <h3 className="text-xs font-bold tracking-widest uppercase text-gray-500">Split Among {expense.participants.length} People</h3>
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

               {expense.receipt_breakdown && (
                  <ReceiptBreakdownCard
                     breakdown={expense.receipt_breakdown}
                     users={users}
                     currentUserId={currentUserId}
                     onEdit={expense.is_deleted ? undefined : openReceiptSplitEditor}
                  />
               )}
            </div>

            {/* Right Column */}
            <div className="w-full lg:w-[380px] shrink-0 grid grid-cols-1 sm:grid-cols-2 lg:flex lg:flex-col gap-6">
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
                           let actionStr = 'updated this expense';
                           if (log.action === 'CREATE') actionStr = 'created this expense';
                           else if (log.action === 'DELETE') actionStr = 'deleted this expense';
                           
                           type AuditChange = { type: 'field'; field: string; old: unknown; new: unknown } | { type: 'split'; user_id: number; field: 'amount_owed' | 'amount_paid'; old: number; new: number };
                           let parsedChanges: AuditChange[] = [];
                           try {
                              if (log.changes) {
                                 const parsed = JSON.parse(log.changes);
                                 if (Array.isArray(parsed)) {
                                    parsedChanges = parsed as AuditChange[];
                                 }
                              }
                           } catch {
                              parsedChanges = [];
                           }
                           const visibleChanges = parsedChanges.filter(change => change.type !== 'field' || change.field !== 'date');
                           const changeTimestamp = new Date(log.timestamp).toLocaleString();
                           if (log.action === 'UPDATE' && parsedChanges.length > 0 && visibleChanges.length === 0) {
                              return null;
                           }
                           const updateSummary = visibleChanges.map(change => {
                              if (change.type === 'field') {
                                 const fieldName = change.field.replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase());
                                 const isMoney = change.field === 'total_amount';
                                 const newVal = isMoney ? `$${Number(change.new).toFixed(2)}` : String(change.new || 'None');
                                 return `${fieldName} to ${newVal}`;
                              }

                              const splitUser = users.find(usr => usr.id === change.user_id) || { id: -1, name: 'Someone' };
                              const splitName = splitUser.id === currentUserId ? 'You' : splitUser.name;
                              const fieldName = change.field === 'amount_owed' ? 'owed amount' : 'paid amount';
                              return `${splitName}'s ${fieldName} to $${Number(change.new).toFixed(2)}`;
                           }).join(', ');
                           const isUpdateWithSummary = log.action === 'UPDATE' && updateSummary;

                           return (
                              <div key={log.id} className="relative pl-6">
                                 <span className={clsx("absolute -left-[11px] top-1 w-5 h-5 rounded-full border-4 border-white flex items-center justify-center", idx === auditLogs.length - 1 ? "bg-[#EAF5F2]" : "bg-gray-200")}>
                                    <span className={clsx("w-1.5 h-1.5 rounded-full", idx === auditLogs.length - 1 ? "bg-[#007A64]" : "bg-gray-400")} />
                                 </span>
                                 {isUpdateWithSummary ? (
                                    <p className="text-sm text-gray-900 leading-snug">
                                       <span className="font-bold">{isYou ? 'You' : u.name}</span> updated {updateSummary} at <span className="text-gray-600">{changeTimestamp}</span>
                                    </p>
                                 ) : (
                                    <>
                                       <p className="text-sm text-gray-900"><span className="font-bold">{isYou ? 'You' : u.name}</span> {actionStr}</p>
                                       <p className="text-[11px] text-gray-500 mt-1">{new Date(log.timestamp).toLocaleDateString()} &bull; {new Date(log.timestamp).toLocaleTimeString()}</p>
                                    </>
                                 )}
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
               <div className="bg-[#EAF5F2] border border-[#c1e0d7] rounded-2xl p-6 shadow-sm sm:col-span-2 lg:col-span-1">
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
         {showDeleteConfirm && (
            <ExpenseDeleteDialog
               expense={expense}
               currentUserId={currentUserId}
               onClose={() => setShowDeleteConfirm(false)}
               onDeleted={onDeleted}
            />
         )}
         {showReceiptSplitEditor && receiptEditorData && expense.receipt_breakdown && (
            <ItemizedSplitStep
               receiptData={receiptEditorData}
               setReceiptData={setReceiptEditorData}
               users={users}
               involvedUsers={involvedUsers}
               currentUserId={currentUserId}
               payerId={payerId}
               initialBreakdown={expense.receipt_breakdown}
               onSave={handleSaveReceiptSplit}
               onClose={() => {
                  setShowReceiptSplitEditor(false);
                  setReceiptEditorData(null);
               }}
               onBack={() => {
                  setShowReceiptSplitEditor(false);
                  setReceiptEditorData(null);
               }}
            />
         )}
      </div>
   );
}

function receiptBreakdownToReviewData(breakdown: ReceiptBreakdown): ReceiptReviewData {
   return {
      items: breakdown.items.map(item => ({
         name: item.name,
         quantity: item.quantity ?? undefined,
         price: item.price,
      })),
      subtotal: breakdown.totals.subtotal,
      discount: breakdown.totals.discount,
      tax: breakdown.totals.tax,
      tip: breakdown.totals.tip,
      total: breakdown.totals.total,
      is_receipt: true,
   };
}

function receiptBreakdownToInvolvedUsers(breakdown: ReceiptBreakdown): BooleanById {
   const involved: BooleanById = {};
   breakdown.member_totals.forEach(member => {
      involved[member.user_id] = true;
   });
   return involved;
}

function toExpenseCategory(category: string | null | undefined): ExpenseCategory {
   const categories: ExpenseCategory[] = ['Dining', 'Accommodation', 'Transport', 'Groceries', 'Entertainment', 'General'];
   return categories.includes(category as ExpenseCategory) ? category as ExpenseCategory : 'General';
}
