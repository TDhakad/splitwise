import React, { useState, useMemo, useEffect } from 'react';
import MSIcon from './MSIcon';
import clsx from 'clsx';
import { avatarColor, initials } from '../lib/utils.js';

export default function ItemizedSplitStep({ receiptData, users, involvedUsers, currentUserId, payerId, onSave, onClose, onBack }) {
  const activeUsers = users.filter(u => involvedUsers[u.id]);
  
  // Array of arrays of user IDs (for equal splits)
  const [itemAssignments, setItemAssignments] = useState(() => {
    return receiptData.items.map(() => activeUsers.map(u => u.id));
  });

  // Array of objects { [userId]: exactAmount } or null for equal split
  const [customSplits, setCustomSplits] = useState(() => {
    return receiptData.items.map(() => null);
  });

  const [editingItemIdx, setEditingItemIdx] = useState(null);

  const toggleUserForItem = (itemIndex, userId) => {
    const newAssignments = [...itemAssignments];
    const current = newAssignments[itemIndex];
    if (current.includes(userId)) {
      newAssignments[itemIndex] = current.filter(id => id !== userId);
    } else {
      newAssignments[itemIndex] = [...current, userId];
    }
    setItemAssignments(newAssignments);
    
    // Reset custom split if they toggle avatars
    if (customSplits[itemIndex]) {
      const newCustoms = [...customSplits];
      newCustoms[itemIndex] = null;
      setCustomSplits(newCustoms);
    }
  };

  const setAllForMe = () => {
    setItemAssignments(receiptData.items.map(() => [currentUserId]));
    setCustomSplits(receiptData.items.map(() => null));
  };

  const handleSaveCustomSplit = (idx, newSplit) => {
    const newCustoms = [...customSplits];
    newCustoms[idx] = newSplit;
    setCustomSplits(newCustoms);

    const newAssignments = [...itemAssignments];
    newAssignments[idx] = Object.keys(newSplit).map(Number).filter(uid => newSplit[uid] > 0);
    setItemAssignments(newAssignments);
    
    setEditingItemIdx(null);
  };

  // Calculations
  const memberTotals = useMemo(() => {
    const totals = {};
    activeUsers.forEach(u => totals[u.id] = { subtotal: 0, discount: 0, tax: 0, tip: 0, total: 0 });

    receiptData.items.forEach((item, idx) => {
      const assigned = itemAssignments[idx];
      const custom = customSplits[idx];
      
      if (custom) {
        // Use custom exact amounts
        Object.keys(custom).forEach(uid => {
          if (totals[uid]) totals[uid].subtotal += parseFloat(custom[uid]) || 0;
        });
      } else {
        // Use equal split
        if (assigned.length === 0) return;
        const splitAmount = (parseFloat(item.price) || 0) / assigned.length;
        assigned.forEach(uid => {
          if (totals[uid]) totals[uid].subtotal += splitAmount;
        });
      }
    });

    const totalSubtotal = Object.values(totals).reduce((sum, t) => sum + t.subtotal, 0);
    const discountTotal = parseFloat(receiptData.discount) || 0;
    const taxTotal = parseFloat(receiptData.tax) || 0;
    const tipTotal = parseFloat(receiptData.tip) || 0;

    if (totalSubtotal > 0) {
      Object.keys(totals).forEach(uid => {
        const share = totals[uid].subtotal / totalSubtotal;
        totals[uid].discount = share * discountTotal;
        totals[uid].tax = share * taxTotal;
        totals[uid].tip = share * tipTotal;
        totals[uid].total = totals[uid].subtotal - totals[uid].discount + totals[uid].tax + totals[uid].tip;
      });
    }

    return totals;
  }, [itemAssignments, customSplits, receiptData, activeUsers]);

  const assignedSum = Object.values(memberTotals).reduce((sum, t) => sum + t.total, 0);
  const unassigned = (parseFloat(receiptData.total) || 0) - assignedSum;
  
  // To avoid blocking the user due to AI extraction math errors, 
  // we consider it fully assigned if every item has at least one person paying for it.
  const isFullyAssigned = itemAssignments.every(a => a.length > 0);

  const handleNextClick = () => {
    const participants = activeUsers.map(u => ({
      user_id: u.id,
      amount_paid: u.id === parseInt(payerId) ? receiptData.total : 0,
      amount_owed: memberTotals[u.id].total
    }));

    onSave(participants, receiptData.total);
  };

  const getSplitText = (idx, item) => {
    const assigned = itemAssignments[idx];
    const custom = customSplits[idx];

    if (assigned.length === 0) return { text: "Needs assignment", alert: true };

    if (custom) {
      const names = assigned.map(uid => activeUsers.find(u => u.id === uid)?.name.split(' ')[0] || 'Unknown');
      return { text: `Custom split between ${names.join(', ')}`, alert: false };
    }

    if (assigned.length === activeUsers.length) {
      return { text: `Split between All ($${(item.price / assigned.length).toFixed(2)} each)`, alert: false };
    }

    const names = assigned.map(uid => {
      if (uid === currentUserId) return 'You';
      return activeUsers.find(u => u.id === uid)?.name.split(' ')[0] || 'Unknown';
    });
    return { text: `Split between ${names.join(', ')} ($${(item.price / assigned.length).toFixed(2)} each)`, alert: false };
  };

  return (
    <>
      <div className="fixed top-0 right-0 bottom-0 w-full md:w-[calc(100%-16rem)] bg-[#F8F9FB] z-50 flex flex-col animate-in slide-in-from-right-8 duration-300">
        <header className="h-20 bg-white border-b border-gray-200 flex items-center justify-between px-8 shrink-0">
          <div className="flex items-center gap-4">
             <button onClick={onBack} className="p-2 -ml-2 rounded-full hover:bg-gray-100 transition-colors">
                <MSIcon name="arrow_back" className="text-gray-900" />
             </button>
             <h1 className="font-bold text-xl text-gray-900">Itemized Split</h1>
          </div>
          <div className="flex items-center gap-5">
             <button onClick={onClose} className="text-gray-500 hover:text-gray-900 transition-colors">
                <MSIcon name="close" />
             </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8">
          <div className="max-w-6xl mx-auto flex flex-col lg:flex-row gap-8 items-start">
            
            {/* Left Column: Items */}
            <div className="flex-1 w-full bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
              <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-white sticky top-0 z-10">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Receipt Items</h2>
                  <p className="text-sm text-gray-500 mt-1">Tap avatars to assign items.</p>
                </div>
                <button onClick={setAllForMe} className="text-sm font-semibold text-[#007A64] hover:text-[#006150] transition-colors">
                  Select All for Me
                </button>
              </div>

              <div className="divide-y divide-gray-100">
                {receiptData.items.map((item, idx) => {
                  const splitInfo = getSplitText(idx, item);
                  return (
                    <div key={idx} className="p-6 hover:bg-gray-50/50 transition-colors group">
                      <div className="flex justify-between items-start mb-4">
                        <div className="font-medium text-gray-900">{item.name}</div>
                        <div className="font-medium text-gray-900">${(parseFloat(item.price) || 0).toFixed(2)}</div>
                      </div>
                      
                      <div className="flex items-center gap-3 mb-4">
                        {activeUsers.map(u => {
                          const isAssigned = itemAssignments[idx].includes(u.id);
                          return (
                            <button 
                              key={u.id}
                              onClick={() => toggleUserForItem(idx, u.id)}
                              className={clsx(
                                "w-10 h-10 rounded-full flex items-center justify-center font-bold text-white text-sm transition-all relative overflow-hidden",
                                isAssigned 
                                  ? "ring-2 ring-offset-2 ring-[#007A64] shadow-sm" 
                                  : "opacity-40 grayscale hover:grayscale-0 hover:opacity-100",
                                avatarColor(u.id)
                              )}
                            >
                              {initials(u.name)}
                            </button>
                          );
                        })}
                      </div>

                      <button 
                        onClick={() => setEditingItemIdx(idx)}
                        className={clsx(
                          "w-full text-left rounded-xl px-4 py-2.5 text-sm flex items-center gap-2 transition-colors",
                          splitInfo.alert 
                            ? "bg-red-50 text-red-600 hover:bg-red-100" 
                            : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                        )}
                      >
                        {splitInfo.alert ? <MSIcon name="error_outline" style={{fontSize: 16}} /> : <MSIcon name="call_split" style={{fontSize: 16}} />}
                        {splitInfo.text}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right Column: Summary */}
            <div className="w-full lg:w-96 shrink-0 bg-white border border-gray-200 rounded-2xl shadow-sm p-6 sticky top-8">
              <h3 className="text-[11px] font-bold text-gray-500 tracking-wider uppercase mb-4">Current Split Summary</h3>
              
              <div className="mb-6">
                <div className="text-sm text-gray-500 mb-1">Total Bill (inc. Tax/Tip)</div>
                <div className="text-4xl font-bold text-gray-900 mb-4">${(parseFloat(receiptData.total) || 0).toFixed(2)}</div>
                
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden flex mb-2">
                  <div 
                    className="h-full bg-[#00D69D] transition-all" 
                    style={{ width: `${Math.min(100, (assignedSum / receiptData.total) * 100)}%` }}
                  />
                  {unassigned > 0.01 && (
                    <div 
                      className="h-full bg-red-100 transition-all" 
                      style={{ width: `${(unassigned / receiptData.total) * 100}%` }}
                    />
                  )}
                </div>
                
                <div className="flex justify-between text-xs font-medium">
                  <span className="text-gray-600">Assigned: ${assignedSum.toFixed(2)}</span>
                  {unassigned > 0.01 && <span className="text-red-500">Unassigned: ${unassigned.toFixed(2)}</span>}
                  {unassigned < -0.01 && <span className="text-red-500">Overassigned: ${Math.abs(unassigned).toFixed(2)}</span>}
                </div>
              </div>

              <div className="border-t border-gray-100 pt-6 mb-8">
                <h3 className="text-[11px] font-bold text-gray-500 tracking-wider uppercase mb-4">Member Totals</h3>
                <div className="space-y-4">
                  {activeUsers.map(u => (
                    <div key={u.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={clsx("w-8 h-8 rounded-full flex items-center justify-center font-bold text-white text-xs", avatarColor(u.id))}>
                          {initials(u.name)}
                        </div>
                        <span className="font-medium text-gray-900">{u.id === currentUserId ? 'You' : u.name}</span>
                      </div>
                      <span className="font-bold text-gray-900">${memberTotals[u.id].total.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>

              <button 
                onClick={handleNextClick}
                disabled={!isFullyAssigned}
                className={clsx(
                  "w-full font-bold py-3.5 rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 text-base",
                  isFullyAssigned ? "bg-[#007A64] hover:bg-[#006150] text-white" : "bg-gray-100 text-gray-400 cursor-not-allowed"
                )}
              >
                Finish Split <MSIcon name="arrow_forward" />
              </button>
              
              {!isFullyAssigned && (
                <p className="text-center text-xs text-red-500 mt-3 font-medium">
                  Assign all items to finish.
                </p>
              )}
            </div>

          </div>
        </div>
      </div>

      {editingItemIdx !== null && (
        <EditItemSplitModal 
          item={receiptData.items[editingItemIdx]}
          activeUsers={activeUsers}
          currentAssignments={itemAssignments[editingItemIdx]}
          currentCustom={customSplits[editingItemIdx]}
          onSave={(newSplit) => handleSaveCustomSplit(editingItemIdx, newSplit)}
          onClose={() => setEditingItemIdx(null)}
          currentUserId={currentUserId}
        />
      )}
    </>
  );
}

function EditItemSplitModal({ item, activeUsers, currentAssignments, currentCustom, onSave, onClose, currentUserId }) {
  const [splitMethod, setSplitMethod] = useState(currentCustom ? 'unequal' : 'equal');
  
  const [customValues, setCustomValues] = useState(() => {
    if (currentCustom) return { ...currentCustom };
    const cv = {};
    activeUsers.forEach(u => cv[u.id] = currentAssignments.includes(u.id) ? (item.price / currentAssignments.length).toFixed(2) : '');
    return cv;
  });
  
  const [shares, setShares] = useState(() => {
    const s = {};
    activeUsers.forEach(u => s[u.id] = currentAssignments.includes(u.id) ? 1 : 0);
    return s;
  });
  
  const [toggles, setToggles] = useState(() => {
    const t = {};
    activeUsers.forEach(u => t[u.id] = currentAssignments.includes(u.id));
    return t;
  });

  const preview = useMemo(() => {
    const result = {};
    if (splitMethod === 'equal') {
      const activeCount = Object.values(toggles).filter(Boolean).length;
      const eq = activeCount > 0 ? item.price / activeCount : 0;
      activeUsers.forEach(u => result[u.id] = toggles[u.id] ? eq : 0);
    } else if (splitMethod === 'shares') {
      const totalShares = Object.values(shares).reduce((a, b) => a + (parseFloat(b) || 0), 0);
      const perShare = totalShares > 0 ? item.price / totalShares : 0;
      activeUsers.forEach(u => result[u.id] = (parseFloat(shares[u.id]) || 0) * perShare);
    } else {
      activeUsers.forEach(u => result[u.id] = parseFloat(customValues[u.id]) || 0);
    }
    return result;
  }, [splitMethod, toggles, shares, customValues, item.price, activeUsers]);

  const sum = Object.values(preview).reduce((a, b) => a + b, 0);
  const diff = item.price - sum;
  const isValid = Math.abs(diff) <= 0.02;

  const handleSave = () => {
    if (!isValid) return;
    const finalSplit = {};
    activeUsers.forEach(u => finalSplit[u.id] = preview[u.id]);
    onSave(finalSplit);
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[60]" onClick={onClose} />
      <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
          <div className="p-6 border-b border-gray-100 pb-4">
            <h3 className="font-bold text-lg text-gray-900">Edit Item Split</h3>
            <p className="text-sm text-gray-500 mb-4">{item.name}</p>
            
            <div className="bg-gray-100 p-1 rounded-lg flex items-center mb-2">
              {['equal', 'unequal', 'shares'].map(mode => (
                <button
                  key={mode}
                  onClick={() => setSplitMethod(mode)}
                  className={clsx(
                    "flex-1 text-sm font-bold py-1.5 rounded-md transition-all capitalize",
                    splitMethod === mode ? "bg-white text-[#007A64] shadow-sm" : "text-gray-500 hover:text-gray-700"
                  )}
                >
                  {mode === 'equal' ? 'Equally' : mode === 'unequal' ? 'Unequally' : 'Shares'}
                </button>
              ))}
            </div>
          </div>
          
          <div className="p-6 space-y-4 max-h-[50vh] overflow-y-auto">
            {activeUsers.map(u => (
              <div key={u.id} className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className={clsx("w-8 h-8 rounded-full flex items-center justify-center font-bold text-white text-xs", avatarColor(u.id))}>
                    {initials(u.name)}
                  </div>
                  <span className="font-medium text-gray-900">{u.id === currentUserId ? 'You' : u.name.split(' ')[0]}</span>
                </div>
                
                {splitMethod === 'equal' && (
                  <div className="flex items-center gap-3">
                    <span className="text-gray-500 text-sm font-medium">${preview[u.id].toFixed(2)}</span>
                    <button 
                      onClick={() => setToggles({...toggles, [u.id]: !toggles[u.id]})}
                      className={clsx("w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors shrink-0", toggles[u.id] ? "bg-[#007A64] border-[#007A64]" : "border-gray-300")}
                    >
                      {toggles[u.id] && <MSIcon name="check" style={{fontSize: 14, color: 'white'}} />}
                    </button>
                  </div>
                )}

                {splitMethod === 'shares' && (
                  <div className="flex items-center gap-3">
                    <span className="text-gray-500 text-sm font-medium w-16 text-right">${preview[u.id].toFixed(2)}</span>
                    <input 
                      type="number"
                      value={shares[u.id] === 0 ? '' : shares[u.id]}
                      onChange={e => setShares({ ...shares, [u.id]: e.target.value })}
                      className="w-16 bg-gray-50 border border-gray-200 rounded-lg py-1.5 px-2 text-center font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#007A64]/20 focus:border-[#007A64]"
                      placeholder="0"
                      min="0"
                    />
                  </div>
                )}

                {splitMethod === 'unequal' && (
                  <div className="flex items-center relative w-24">
                    <span className="absolute left-3 text-gray-500">$</span>
                    <input 
                      type="number"
                      value={customValues[u.id]}
                      onChange={e => setCustomValues({ ...customValues, [u.id]: e.target.value })}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl py-2 pl-6 pr-3 text-right font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#007A64]/20 focus:border-[#007A64] transition-all"
                      placeholder="0.00"
                      step="0.01"
                      min="0"
                    />
                  </div>
                )}
              </div>
            ))}
            
            <div className="pt-4 border-t border-gray-100 flex justify-between items-center text-sm">
              <span className="text-gray-500">Item Total: ${item.price.toFixed(2)}</span>
              <span className={clsx("font-bold", isValid ? "text-[#007A64]" : "text-red-500")}>
                {diff > 0.02 ? `$${diff.toFixed(2)} left` : diff < -0.02 ? `-$${Math.abs(diff).toFixed(2)} over` : '0.00 left'}
              </span>
            </div>
          </div>

          <div className="p-6 bg-gray-50 flex gap-3">
            <button onClick={onClose} className="flex-1 py-2.5 rounded-xl font-bold text-gray-600 bg-white border border-gray-200 hover:bg-gray-50 transition-colors">Cancel</button>
            <button onClick={handleSave} disabled={!isValid} className="flex-1 py-2.5 rounded-xl font-bold text-white bg-[#007A64] hover:bg-[#006150] disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors">Save Split</button>
          </div>
        </div>
      </div>
    </>
  );
}
