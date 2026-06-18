import React, { useState, useEffect } from 'react';
import clsx from 'clsx';
import MSIcon from './MSIcon';
import CustomDropdown from './CustomDropdown';
import { avatarColor, initials } from '../lib/utils';
import { API_BASE_URL, apiFetch } from '../lib/constants';

export default function EditExpenseModal({ expense, users, currentUserId, onClose, onSave }) {
  // State initialization from existing expense
  const [description, setDescription] = useState(expense?.description || '');
  const [amount, setAmount] = useState((expense?.total_amount || 0).toString());
  const [date, setDate] = useState(expense?.date ? expense.date.split('T')[0] : new Date().toISOString().split('T')[0]);
  const [category, setCategory] = useState(expense?.category || 'Entertainment / Drinks');
  const [splitMethod, setSplitMethod] = useState('Equally');
  
  // Find who paid (simplification: assume single payer for UI)
  const payerPart = expense?.participants?.find(p => p.amount_paid > 0) || expense?.participants?.[0];
  const [payerId, setPayerId] = useState(payerPart ? payerPart.user_id : currentUserId);

  // Initialize splits based on participants
  const initialSplits = {};
  expense?.participants?.forEach(p => {
    initialSplits[p.user_id] = (p.amount_owed || 0).toFixed(2);
  });
  
  const [splits, setSplits] = useState(initialSplits);
  const [hasReceipt, setHasReceipt] = useState(expense?.has_receipt || false);

  // Auto-calculate splits when splitMethod === 'Equally'
  useEffect(() => {
    if (splitMethod === 'Equally') {
      const parsed = parseFloat(amount) || 0;
      const count = expense?.participants?.length || 1;
      const share = (parsed / count).toFixed(2);
      const newSplits = {};
      expense?.participants?.forEach(p => {
        newSplits[p.user_id] = share;
      });
      setSplits(newSplits);
    }
  }, [amount, splitMethod, expense]);

  const handleSplitMethodChange = (newMethod) => {
    if (newMethod === splitMethod) return;

    const parsedAmount = parseFloat(amount) || 0;
    const count = expense?.participants?.length || 1;

    if (newMethod === 'Equally') {
      const share = (parsedAmount / count).toFixed(2);
      const newSplits = {};
      expense?.participants?.forEach(p => {
        newSplits[p.user_id] = share;
      });
      setSplits(newSplits);
    } else if (newMethod === 'Unequally') {
      if (splitMethod === 'Shares') {
        const newSplits = {};
        expense?.participants?.forEach(p => {
          const pct = parseFloat(splits[p.user_id]) || 0;
          newSplits[p.user_id] = ((pct / 100) * parsedAmount).toFixed(2);
        });
        setSplits(newSplits);
      }
    } else if (newMethod === 'Shares') {
      const newSplits = {};
      expense?.participants?.forEach(p => {
        const dollarVal = parseFloat(splits[p.user_id]) || 0;
        const pct = parsedAmount > 0 ? (dollarVal / parsedAmount) * 100 : (100 / count);
        newSplits[p.user_id] = pct.toFixed(1);
      });
      setSplits(newSplits);
    }

    setSplitMethod(newMethod);
  };

  const handleSave = async () => {
    const parsedAmount = parseFloat(amount) || 0;
    // Determine who owes what based on the splits
    const participants = (expense?.participants || []).map(p => {
       let userAmountOwed = 0;
       if (splitMethod === 'Shares') {
          const pct = parseFloat(splits[p.user_id]) || 0;
          userAmountOwed = (pct / 100) * parsedAmount;
       } else {
          userAmountOwed = parseFloat(splits[p.user_id]) || 0;
       }
       const userAmountPaid = p.user_id === payerId ? parsedAmount : 0;
       return {
          user_id: p.user_id,
          amount_paid: userAmountPaid,
          amount_owed: userAmountOwed
       };
    });

    const payload = {
       group_id: expense?.group_id,
       description,
       total_amount: parsedAmount,
       currency: expense?.currency || 'USD',
       date: date ? new Date(date).toISOString() : new Date().toISOString(),
       category,
       has_receipt: hasReceipt,
       participants
    };

    try {
       const res = await apiFetch(`/expenses/${expense.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload)
       });
       if (res.ok) {
          onSave();
       } else {
          console.error("Failed to save", await res.text());
       }
    } catch(e) {
       console.error("Error saving expense", e);
    }
  };

  const totalAccounted = Object.values(splits || {}).reduce((sum, val) => sum + (parseFloat(val) || 0), 0);
  const parsedAmount = parseFloat(amount) || 0;
  const isPerfectSplit = splitMethod === 'Shares'
    ? Math.abs(totalAccounted - 100) < 0.1
    : Math.abs(totalAccounted - parsedAmount) < 0.01;

  const handleSplitChange = (userId, value) => {
    setSplits(prev => ({ ...prev, [userId]: value }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm" onClick={onClose} />
      <div className="bg-[#F8F9FA] rounded-2xl w-full max-w-5xl max-h-[90vh] flex flex-col relative shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between px-8 py-6 border-b border-gray-200 bg-white shrink-0">
          <div className="flex items-center gap-4">
            <button onClick={onClose} className="w-10 h-10 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-100 hover:text-gray-900 transition-colors">
              <MSIcon name="close" className="text-xl" />
            </button>
            <h2 className="text-2xl font-bold text-gray-900">Edit Expense</h2>
          </div>
          <div className="flex items-center gap-4">
            <button onClick={onClose} className="text-[#007A64] font-bold text-sm hover:underline">
              Cancel
            </button>
            <button onClick={handleSave} className="px-6 py-2.5 bg-[#007A64] hover:bg-[#00604f] text-white rounded-full font-bold text-sm transition-colors shadow-sm disabled:opacity-50" disabled={!isPerfectSplit}>
              Save Changes
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8">
          <div className="flex flex-col lg:flex-row gap-8">
            
            {/* Left Column */}
            <div className="flex-1 space-y-6">
              
              {/* Basic Details Box */}
              <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-6">
                <div className="flex gap-6">
                  <div className="flex-1">
                    <label className="block text-[11px] font-bold tracking-widest uppercase text-gray-500 mb-2">Amount</label>
                    <div className="flex items-center border-b border-gray-300 pb-2 focus-within:border-[#007A64] transition-colors">
                      <span className="text-2xl text-gray-400 mr-2">$</span>
                      <input 
                        type="number" 
                        value={amount} 
                        onChange={e => setAmount(e.target.value)}
                        className="w-full text-4xl font-bold text-gray-900 bg-transparent outline-none"
                      />
                    </div>
                  </div>
                  <div className="flex-1">
                    <label className="block text-[11px] font-bold tracking-widest uppercase text-gray-500 mb-2">Description</label>
                    <div className="flex items-center border-b border-gray-300 pb-2 focus-within:border-[#007A64] transition-colors h-full">
                      <input 
                        type="text" 
                        value={description}
                        onChange={e => setDescription(e.target.value)}
                        className="w-full text-xl font-medium text-gray-900 bg-transparent outline-none"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex gap-6">
                  <div className="flex-1">
                    <label className="block text-[11px] font-bold tracking-widest uppercase text-gray-500 mb-2">Date</label>
                    <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-4 py-3 focus-within:border-[#007A64] focus-within:ring-1 focus-within:ring-[#007A64]">
                      <MSIcon name="calendar_today" className="text-gray-400" />
                      <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full outline-none text-gray-900 font-medium bg-transparent" />
                    </div>
                  </div>
                  <div className="flex-1">
                    <CustomDropdown
                      value={category}
                      onChange={setCategory}
                      options={[
                        { value: 'Entertainment / Drinks', label: 'Entertainment / Drinks', icon: 'local_bar' },
                        { value: 'Dining Out', label: 'Dining Out', icon: 'restaurant' },
                        { value: 'Groceries', label: 'Groceries', icon: 'shopping_cart' },
                        { value: 'Travel', label: 'Travel', icon: 'flight' }
                      ]}
                      renderSelected={(opt) => (
                        <>
                          <MSIcon name={opt.icon} className="text-gray-500" />
                          <span className="font-medium text-gray-900">{opt.label}</span>
                        </>
                      )}
                      renderOption={(opt, isSelected) => (
                        <>
                          <MSIcon name={opt.icon} className={isSelected ? "text-[#007A64]" : "text-gray-500"} />
                          <span className="flex-1 font-medium">{opt.label}</span>
                          {isSelected && <MSIcon name="check" className="text-[#007A64] text-sm" />}
                        </>
                      )}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold tracking-widest uppercase text-gray-500 mb-2">Paid By</label>
                  <CustomDropdown
                    value={payerId}
                    onChange={(val) => setPayerId(parseInt(val))}
                    options={(expense?.participants || []).map(p => ({ value: p.user_id }))}
                    renderSelected={(opt) => {
                      const u = users.find(usr => usr.id === opt.value);
                      return (
                        <>
                          <div className={clsx("w-8 h-8 rounded-full flex items-center justify-center font-bold text-white text-xs", avatarColor(opt.value))}>
                            {initials(u?.name || 'U')}
                          </div>
                          <span className="font-medium text-gray-900 text-base">{u?.id === currentUserId ? `${u?.name} (You)` : u?.name}</span>
                        </>
                      );
                    }}
                    renderOption={(opt, isSelected) => {
                      const u = users.find(usr => usr.id === opt.value);
                      return (
                        <>
                          <div className={clsx("w-8 h-8 rounded-full flex items-center justify-center font-bold text-white text-xs", avatarColor(opt.value))}>
                            {initials(u?.name || 'U')}
                          </div>
                          <span className="flex-1 font-medium text-base">{u?.id === currentUserId ? `${u?.name} (You)` : u?.name}</span>
                          <div className={clsx("w-5 h-5 rounded-full border-2 flex items-center justify-center mr-2", isSelected ? "border-[#007A64]" : "border-gray-300")}>
                            {isSelected && <div className="w-2.5 h-2.5 rounded-full bg-[#007A64]" />}
                          </div>
                        </>
                      );
                    }}
                  />
                </div>
              </div>

              {/* Splits Box */}
              <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="font-bold text-gray-900 text-lg">Split Method</h3>
                  <div className="flex bg-gray-100 rounded-lg p-1">
                    {['Equally', 'Unequally', 'Shares'].map(m => (
                      <button 
                        key={m} 
                        onClick={() => handleSplitMethodChange(m)}
                        className={clsx(
                          "px-4 py-1.5 text-sm font-medium rounded-md transition-colors",
                          splitMethod === m ? "bg-white text-[#007A64] shadow-sm" : "text-gray-600 hover:text-gray-900"
                        )}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-4 mb-8">
                  {expense?.participants?.map(p => {
                    const user = users.find(u => u.id === p.user_id);
                    return (
                      <div key={p.user_id} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={clsx("w-10 h-10 rounded-full flex items-center justify-center font-bold text-white shadow-sm", avatarColor(p.user_id))}>
                            {initials(user?.name || 'U')}
                          </div>
                          <span className="font-medium text-gray-900">{user?.name}</span>
                        </div>
                        <div className="flex items-center gap-1 text-gray-900 font-medium">
                          {splitMethod !== 'Shares' && <span className="text-gray-400 mr-0.5">$</span>}
                          <input 
                            type="number" 
                            className="w-20 text-right outline-none bg-transparent disabled:opacity-60 font-bold" 
                            value={splits?.[p.user_id] || ''} 
                            disabled={splitMethod === 'Equally'}
                            onChange={(e) => handleSplitChange(p.user_id, e.target.value)}
                          />
                          {splitMethod === 'Shares' && <span className="text-gray-400 ml-0.5">%</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="pt-4 border-t border-gray-200">
                  <div className="flex justify-between items-end mb-2">
                    <span className="text-sm font-medium text-gray-500">Total Accounted For</span>
                    <span className={clsx("font-bold text-lg", isPerfectSplit ? "text-[#007A64]" : "text-red-500")}>
                      {splitMethod === 'Shares'
                        ? `${totalAccounted.toFixed(1)}% / 100.0%`
                        : `$${totalAccounted.toFixed(2)} / $${parsedAmount.toFixed(2)}`
                      }
                    </span>
                  </div>
                  <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                    <div 
                      className={clsx("h-full rounded-full transition-all", isPerfectSplit ? "bg-[#007A64]" : "bg-red-500")}
                      style={{ 
                        width: `${Math.min(
                          splitMethod === 'Shares'
                            ? totalAccounted
                            : (totalAccounted / (parsedAmount || 1)) * 100, 
                          100
                        )}%` 
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column - Receipt */}
            <div className="w-[320px] shrink-0 bg-white rounded-2xl border border-gray-200 shadow-sm p-6 flex flex-col h-fit">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-gray-900 text-lg">Receipt</h3>
                {hasReceipt && (
                   <button onClick={() => setHasReceipt(false)} className="text-[#D93F3C] hover:bg-red-50 p-1.5 rounded-lg transition-colors">
                     <MSIcon name="delete_outline" className="text-xl" />
                   </button>
                )}
              </div>
              
              {hasReceipt ? (
                 <div className="bg-gray-100 rounded-xl overflow-hidden relative min-h-[400px]">
                   <img 
                     src="https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&q=80&w=1000" 
                     alt="Receipt" 
                     className="w-full h-full object-cover"
                   />
                 </div>
              ) : (
                 <div className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-xl flex flex-col items-center justify-center p-8 text-center min-h-[200px] cursor-pointer hover:border-[#007A64] hover:bg-[#EAF5F2] transition-colors group" onClick={() => setHasReceipt(true)}>
                    <MSIcon name="cloud_upload" className="text-4xl text-gray-400 group-hover:text-[#007A64] mb-3 transition-colors" />
                    <p className="text-sm font-bold text-gray-700 group-hover:text-[#007A64]">Click to upload receipt</p>
                    <p className="text-xs text-gray-500 mt-1">PNG, JPG up to 5MB</p>
                 </div>
              )}
            </div>
          </div>

          <div className="mt-8 flex justify-center">
            <button className="flex items-center gap-2 text-[#D93F3C] font-bold text-sm hover:underline px-4 py-2">
              <MSIcon name="delete_outline" className="text-lg" />
              Delete Expense
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
