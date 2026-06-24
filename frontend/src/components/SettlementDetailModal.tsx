import { useState, useEffect } from 'react';
import { clsx } from 'clsx';
import MSIcon from './MSIcon';
import type { Settlement, User } from '../types/api';
import { useUpdateSettlement, useDeleteSettlement } from '../features/settlements/api';
import { avatarColor, initials } from '../lib/utils';

interface SettlementDetailModalProps {
   isOpen: boolean;
   onClose: () => void;
   settlement: Settlement | null;
   users: User[];
   currentUserId: number;
}

export function SettlementDetailModal({ isOpen, onClose, settlement, users, currentUserId }: SettlementDetailModalProps) {
   const [amount, setAmount] = useState('');
   
   useEffect(() => {
       if (settlement) {
           setAmount(settlement.amount.toString());
       }
   }, [settlement]);

   const updateSettlement = useUpdateSettlement();
   const deleteSettlement = useDeleteSettlement();

   if (!isOpen || !settlement) return null;

   const payer = users.find(u => u.id === settlement.payer_id);
   const payee = users.find(u => u.id === settlement.payee_id);
   
   const numAmount = parseFloat(amount);
   const canSubmit = !isNaN(numAmount) && numAmount > 0 && numAmount !== settlement.amount;

   const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!canSubmit) return;
      try {
         await updateSettlement.mutateAsync({
            settlementId: settlement.id,
            payload: { amount: numAmount },
            groupId: settlement.group_id,
            currentUserId,
         });
         onClose();
      } catch (err) {
         console.error('Failed to update settlement:', err);
      }
   };

   const handleDelete = async () => {
      if (!confirm('Are you sure you want to delete this settlement?')) return;
      try {
         await deleteSettlement.mutateAsync({
            settlementId: settlement.id,
            groupId: settlement.group_id,
            currentUserId,
         });
         onClose();
      } catch (err) {
         console.error('Failed to delete settlement:', err);
      }
   };

   return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
         <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm" onClick={onClose} />
         
         <div className="relative w-full max-w-md bg-white rounded-3xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-4 border-b">
               <h2 className="text-lg font-bold text-gray-900">Settlement Details</h2>
               <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors">
                  <MSIcon name="close" />
               </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-6">
               <div className="flex items-center justify-between gap-4 p-4 bg-gray-50 rounded-2xl border border-gray-100">
                  <div className="flex flex-col items-center gap-2 flex-1">
                     <div className={clsx("w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold shadow-sm border-2 border-white", payer ? avatarColor(payer.id) : "bg-gray-200 text-gray-500")}>
                        {initials(payer?.name || 'Someone')}
                     </div>
                     <span className="text-sm font-bold text-gray-900 text-center">{payer?.name || 'Unknown'}</span>
                  </div>
                  
                  <div className="flex flex-col items-center text-[#007A64]">
                     <MSIcon name="arrow_forward" className="text-2xl" />
                     <span className="text-[10px] font-bold uppercase tracking-widest mt-1">Paid</span>
                  </div>

                  <div className="flex flex-col items-center gap-2 flex-1">
                     <div className={clsx("w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold shadow-sm border-2 border-white", payee ? avatarColor(payee.id) : "bg-gray-200 text-gray-500")}>
                        {initials(payee?.name || 'Someone')}
                     </div>
                     <span className="text-sm font-bold text-gray-900 text-center">{payee?.name || 'Unknown'}</span>
                  </div>
               </div>

               <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Amount paid</label>
                  <div className="relative">
                     <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl text-gray-400 font-medium">$</span>
                     <input 
                        type="number" 
                        step="0.01"
                        min="0.01"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="0.00"
                        className="w-full bg-white border border-gray-200 rounded-xl pl-9 pr-4 py-3 text-3xl font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#007A64]/20 focus:border-[#007A64]"
                        required
                     />
                  </div>
               </div>

               <div className="pt-4 flex gap-3">
                  <button type="button" onClick={handleDelete} disabled={deleteSettlement.isPending} className="px-4 py-3 rounded-xl font-bold text-[#D93F3C] bg-[#FDE8E7] hover:bg-[#FAD1CF] transition-colors disabled:opacity-50 flex justify-center items-center gap-2">
                     {deleteSettlement.isPending ? <MSIcon name="refresh" className="animate-spin" /> : <MSIcon name="delete" />}
                  </button>
                  <button type="submit" disabled={updateSettlement.isPending || !canSubmit} className="flex-1 px-4 py-3 rounded-xl font-bold text-white bg-[#007A64] hover:bg-[#00604f] transition-colors disabled:opacity-50 flex justify-center items-center gap-2">
                     {updateSettlement.isPending ? <MSIcon name="refresh" className="animate-spin" /> : <MSIcon name="save" />}
                     Save Changes
                  </button>
               </div>
            </form>
         </div>
      </div>
   );
}
