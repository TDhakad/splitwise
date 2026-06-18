import React, { useState } from 'react';
import clsx from 'clsx';
import MSIcon from './MSIcon';
import CustomDropdown from './CustomDropdown';
import { avatarColor, initials } from '../lib/utils.js';
import { apiFetch } from '../lib/constants.js';

export default function SettleUpModal({ onClose, onSave, users, currentUserId, defaultPayerId, defaultPayeeId, defaultAmount, defaultMaxAmount, defaultGroupId }) {
   const [payerId] = useState(defaultPayerId || currentUserId);
   const [payeeId, setPayeeId] = useState(defaultPayeeId || '');
   const [amount, setAmount] = useState(defaultAmount ? Math.abs(defaultAmount).toFixed(2) : '');
   const [method, setMethod] = useState('cash');
   const [isSubmitting, setIsSubmitting] = useState(false);
   const maxAmount = Number(defaultMaxAmount ?? defaultAmount ?? 0);

   const payerUser = users.find(u => u.id === parseInt(payerId));
   const payeeUser = users.find(u => u.id === parseInt(payeeId));
   const isDirectionLocked = Boolean(defaultPayerId && defaultPayeeId);

   const availablePayees = users.filter(u => u.id !== parseInt(payerId));
   const parsedAmount = Number(amount);
   const exceedsMax = maxAmount > 0 && Math.round(parsedAmount * 100) > Math.round(maxAmount * 100);
   const canSubmit = payerId && payeeId && parseInt(payerId) !== parseInt(payeeId) && amount && !Number.isNaN(parsedAmount) && parsedAmount > 0 && !exceedsMax;

   const handleSubmit = async (e) => {
      e.preventDefault();
      if (!canSubmit) return;

      setIsSubmitting(true);
      try {
         const res = await apiFetch(`/settlements/?current_user_id=${currentUserId}`, {
            method: 'POST',
            body: JSON.stringify({
               group_id: defaultGroupId || null,
               payer_id: parseInt(payerId),
               payee_id: parseInt(payeeId),
               amount: parseFloat(amount),
               currency: 'USD'
            })
         });

         if (res.ok) {
            onSave();
         } else {
            const data = await res.json().catch(() => ({}));
            alert(data.detail || 'Failed to settle up. Please try again.');
         }
      } catch (err) {
         console.error(err);
         alert('Error recording settlement.');
      } finally {
         setIsSubmitting(false);
      }
   };

   return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm animate-in fade-in duration-200">
         <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-[#F8F9FA]">
               <h3 className="font-bold text-lg text-gray-900">Settle Up</h3>
               <button onClick={onClose} className="text-gray-400 hover:text-gray-900 transition-colors">
                  <MSIcon name="close" className="text-xl" />
               </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
               
               {/* From -> To Visual */}
               <div className="flex items-center justify-between bg-[#F8F9FA] p-4 rounded-xl border border-gray-100">
                  <div className="flex flex-col items-center gap-2">
                     <div className={clsx("w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold shadow-sm border-2 border-white", avatarColor(parseInt(payerId)))}>
                        {initials(payerUser?.name || 'User')}
                     </div>
                     <span className="text-xs font-bold text-gray-600">{parseInt(payerId) === currentUserId ? 'You' : payerUser?.name || 'Payer'}</span>
                  </div>

                  <div className="flex-1 flex items-center justify-center relative px-4">
                     <div className="h-[2px] bg-gray-200 w-full absolute top-1/2 -translate-y-1/2"></div>
                     <div className="w-8 h-8 rounded-full bg-white border border-gray-200 flex items-center justify-center z-10 text-[#007A64]">
                        <MSIcon name="arrow_forward" className="text-sm" />
                     </div>
                  </div>

                  <div className="flex flex-col items-center gap-2">
                     {payeeId ? (
                        <div className={clsx("w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold shadow-sm border-2 border-white", avatarColor(parseInt(payeeId)))}>
                           {initials(payeeUser?.name || 'User')}
                        </div>
                     ) : (
                        <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center border-2 border-white shadow-sm border-dashed">
                           <MSIcon name="person" className="text-gray-400" />
                        </div>
                     )}
                     <span className="text-xs font-bold text-gray-600">{payeeUser ? (payeeUser.id === currentUserId ? 'You' : payeeUser.name) : 'Select'}</span>
                  </div>
               </div>

               {!isDirectionLocked && (
                  <div>
                     <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Recipient</label>
                     <div className="relative">
                        <CustomDropdown
                           value={payeeId}
                           onChange={(val) => setPayeeId(val)}
                           placeholder="Choose someone to pay..."
                           options={availablePayees.map(u => ({ value: u.id }))}
                           renderSelected={(opt) => {
                              const u = users.find(usr => usr.id === parseInt(opt.value));
                              return (
                                 <>
                                    <div className={clsx("w-8 h-8 rounded-full flex items-center justify-center font-bold text-white text-xs", avatarColor(parseInt(opt.value)))}>
                                       {initials(u?.name || 'U')}
                                    </div>
                                    <span className="font-medium text-gray-900 text-base">{u?.name}</span>
                                 </>
                              );
                           }}
                           renderOption={(opt, isSelected) => {
                              const u = users.find(usr => usr.id === parseInt(opt.value));
                              return (
                                 <>
                                    <div className={clsx("w-8 h-8 rounded-full flex items-center justify-center font-bold text-white text-xs", avatarColor(parseInt(opt.value)))}>
                                       {initials(u?.name || 'U')}
                                    </div>
                                    <span className="flex-1 font-medium text-base">{u?.name}</span>
                                    <div className={clsx("w-5 h-5 rounded-full border-2 flex items-center justify-center mr-2", isSelected ? "border-[#007A64]" : "border-gray-300")}>
                                       {isSelected && <div className="w-2.5 h-2.5 rounded-full bg-[#007A64]" />}
                                    </div>
                                 </>
                              );
                           }}
                        />
                     </div>
                  </div>
               )}

               {/* Amount */}
               <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Amount to pay</label>
                  <div className="relative">
                     <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl text-gray-400 font-medium">$</span>
                     <input 
                        type="number" 
                        step="0.01"
                        min="0.01"
                        max={maxAmount > 0 ? maxAmount.toFixed(2) : undefined}
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="0.00"
                        className="w-full bg-white border border-gray-200 rounded-xl pl-9 pr-4 py-3 text-3xl font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#007A64]/20 focus:border-[#007A64]"
                        required
                     />
                  </div>
                  {maxAmount > 0 && (
                     <p className={clsx("mt-2 text-xs font-bold", exceedsMax ? "text-[#D93F3C]" : "text-gray-500")}>
                        Maximum outstanding balance: ${maxAmount.toFixed(2)}
                     </p>
                  )}
               </div>

               {/* Payment Method */}
               <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Payment Method</label>
                  <div className="grid grid-cols-2 gap-3">
                     {[
                        { id: 'cash', label: 'Cash', icon: 'payments' },
                        { id: 'venmo', label: 'Venmo', icon: 'account_balance_wallet' },
                        { id: 'paypal', label: 'PayPal', icon: 'credit_card' },
                        { id: 'bank', label: 'Transfer', icon: 'account_balance' },
                     ].map(m => (
                        <label key={m.id} className={clsx("flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors", method === m.id ? 'border-[#007A64] bg-[#EAF5F2] text-[#007A64]' : 'border-gray-200 text-gray-600 hover:bg-gray-50')}>
                           <input type="radio" name="method" value={m.id} checked={method === m.id} onChange={(e) => setMethod(e.target.value)} className="hidden" />
                           <MSIcon name={m.icon} className="text-lg" />
                           <span className="text-sm font-bold">{m.label}</span>
                           {method === m.id && <MSIcon name="check_circle" className="text-sm ml-auto text-[#007A64]" fill={1} />}
                        </label>
                     ))}
                  </div>
               </div>

               {/* Actions */}
               <div className="pt-4 flex gap-3">
                  <button type="button" onClick={onClose} className="flex-1 px-4 py-3 rounded-xl font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors">
                     Cancel
                  </button>
                  <button type="submit" disabled={isSubmitting || !canSubmit} className="flex-1 px-4 py-3 rounded-xl font-bold text-white bg-[#007A64] hover:bg-[#00604f] transition-colors disabled:opacity-50 flex justify-center items-center gap-2">
                     {isSubmitting ? <MSIcon name="refresh" className="animate-spin" /> : <MSIcon name="check" />}
                     Record Payment
                  </button>
               </div>

            </form>
         </div>
      </div>
   );
}
