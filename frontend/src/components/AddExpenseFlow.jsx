import React, { useState } from 'react';
import clsx from 'clsx';
import MSIcon from './MSIcon';
import CustomDropdown from './CustomDropdown';
import ReviewReceiptStep from './ReviewReceiptStep';
import ItemizedSplitStep from './ItemizedSplitStep';
import { avatarColor, initials } from '../lib/utils.js';
import { API_BASE_URL, apiFetch } from '../lib/constants.js';
  
export default function AddExpenseFlow({ users, groups, currentUserId, groupCtx, onClose, onSave }) {
  const [step, setStep] = useState('add');
  const [entryMode, setEntryMode] = useState('manual'); // 'manual' or 'scan'
  const [receiptImage, setReceiptImage] = useState(null);
  const [receiptData, setReceiptData] = useState(null);
  const [isProcessingReceipt, setIsProcessingReceipt] = useState(false);

  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [groupId, setGroupId] = useState(groupCtx ? String(groupCtx.id) : '');
  const [payerId, setPayerId] = useState(currentUserId);
  const [splitMethod, setSplitMethod] = useState('equal');
  const [involvedUsers, setInvolvedUsers] = useState({ [currentUserId]: true });
  const [customValues, setCustomValues] = useState({});
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const total = parseFloat(amount) || 0;
  const activeIds = users.filter(u => involvedUsers[u.id]).map(u => u.id);

  const preview = (() => {
    if (splitMethod === 'equal') { const s = activeIds.length ? total / activeIds.length : 0; return activeIds.reduce((a, id) => ({ ...a, [id]: s }), {}); }
    if (splitMethod === 'unequal') return activeIds.reduce((a, id) => ({ ...a, [id]: parseFloat(customValues[id] || 0) }), {});
    return activeIds.reduce((a, id) => ({ ...a, [id]: (parseFloat(customValues[id] || 0) / 100) * total }), {});
  })();

  const runningSum = Object.values(preview).reduce((s, v) => s + v, 0);
  const pctSum = splitMethod === 'percentage' ? activeIds.reduce((s, id) => s + parseFloat(customValues[id] || 0), 0) : null;
  const validationMsg = (() => {
    if (!total || total <= 0) return '';
    if (!activeIds.length) return 'Select at least one person.';
    if (splitMethod === 'unequal' && Math.abs(runningSum - total) > 0.01) return `Amounts sum to $${runningSum.toFixed(2)}, need $${total.toFixed(2)}.`;
    if (splitMethod === 'percentage' && pctSum !== null && Math.abs(pctSum - 100) > 0.1) return `Percentages sum to ${pctSum.toFixed(1)}%, need 100%.`;
    return '';
  })();
  const canSave = description.trim() && total > 0 && activeIds.length > 0 && !validationMsg;

  const handleSave = async (participantsOverride = null, totalOverride = null) => {
    if (!participantsOverride && !canSave) { setError(validationMsg || 'Please fill all fields.'); return; }
    setSaving(true); setError('');
    const finalTotal = totalOverride !== null ? totalOverride : total;
    
    let participants = participantsOverride;
    if (!participants) {
      participants = activeIds.map(uid => ({ user_id: uid, amount_paid: uid === parseInt(payerId) ? finalTotal : 0, amount_owed: preview[uid] ?? 0 }));
      if (!activeIds.includes(parseInt(payerId))) {
        participants.push({ user_id: parseInt(payerId), amount_paid: finalTotal, amount_owed: 0 });
      }
    }

    const finalDesc = receiptData && !description ? 'Receipt Upload' : description.trim() || 'Receipt Upload';
    
    try {
      const res = await apiFetch(`/expenses/?created_by=${currentUserId}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ group_id: groupId ? parseInt(groupId) : null, description: finalDesc, total_amount: finalTotal, currency: 'USD', participants }),
      });
      if (res.ok) onSave();
      else { const e = await res.json(); setError(e.detail ?? 'Error saving.'); }
    } catch { setError('Network error.'); }
    finally { setSaving(false); }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    setIsProcessingReceipt(true);
    setError('');
    
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      const res = await apiFetch(`/receipts/scan`, {
        method: 'POST',
        body: formData,
      });
      if (res.ok) {
        const data = await res.json();
        setReceiptImage(data.image_url);
        setReceiptData(data.data);
        setStep('review-receipt');
      } else {
        const err = await res.json();
        setError(err.detail ?? 'Failed to process receipt.');
      }
    } catch (e) {
      setError('Network error processing receipt.');
    } finally {
      setIsProcessingReceipt(false);
    }
  };

  const handleFinishItemizedSplit = (participants, finalTotal) => {
    setAmount(finalTotal.toFixed(2));
    setSplitMethod('unequal');
    
    const newInvolved = {};
    const newCustomValues = {};
    
    participants.forEach(p => {
      newInvolved[p.user_id] = true;
      if (p.amount_owed > 0) {
        newCustomValues[p.user_id] = parseFloat(p.amount_owed).toFixed(2);
      }
    });
    
    setInvolvedUsers(newInvolved);
    setCustomValues(newCustomValues);
    setEntryMode('manual');
    setStep('add');
    if (!description) setDescription('Receipt Scan');
  };

  const splitLabel = splitMethod === 'equal' ? 'Equally' : splitMethod === 'unequal' ? 'Unequally' : 'By %';

  if (step === 'review-receipt') {
    return <ReviewReceiptStep receiptImage={receiptImage} receiptData={receiptData} setReceiptData={setReceiptData} onNext={() => setStep('itemized-split')} onClose={onClose} onBack={() => setStep('add')} />;
  }

  if (step === 'itemized-split') {
    return <ItemizedSplitStep receiptData={receiptData} users={users} involvedUsers={involvedUsers} currentUserId={currentUserId} payerId={payerId} onSave={handleFinishItemizedSplit} onClose={onClose} onBack={() => setStep('review-receipt')} />;
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4">
        <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-md shadow-2xl flex flex-col overflow-hidden relative"
          style={{ maxHeight: '95dvh', animation: 'slideUp 0.3s cubic-bezier(0,0,0.2,1)' }}>

          {step === 'add' && (
            <>
              <header className="sticky top-0 w-full z-10 bg-white border-b border-gray-200 flex flex-col px-5 pt-4">
                <div className="flex items-center justify-between mb-4">
                  <button onClick={onClose} className="p-2 -ml-2 rounded-full hover:bg-gray-100 active:scale-95 transition-all"><MSIcon name="close" className="text-gray-900 text-xl" /></button>
                  <h1 className="font-bold text-lg text-gray-900">New Expense</h1>
                  <button onClick={() => handleSave()} disabled={saving || !canSave} className={clsx("font-bold text-sm px-4 py-2 rounded-lg transition-all active:scale-95", canSave ? "text-[#007A64] hover:bg-[#EAF5F2]" : "text-gray-400 cursor-not-allowed")}>Save</button>
                </div>
                <div className="flex gap-6">
                  <button onClick={() => setEntryMode('manual')} className={clsx("pb-3 px-2 text-sm font-bold border-b-2 transition-colors flex items-center gap-2", entryMode === 'manual' ? "border-[#007A64] text-[#007A64]" : "border-transparent text-gray-500 hover:text-gray-700")}>
                    <MSIcon name="edit" style={{ fontSize: 18 }} /> Manual Entry
                  </button>
                  <button onClick={() => setEntryMode('scan')} className={clsx("pb-3 px-2 text-sm font-bold border-b-2 transition-colors flex items-center gap-2", entryMode === 'scan' ? "border-[#007A64] text-[#007A64]" : "border-transparent text-gray-500 hover:text-gray-700")}>
                    <MSIcon name="receipt_long" style={{ fontSize: 18 }} /> Scan Receipt
                  </button>
                </div>
              </header>
              {error && <div className="mx-6 mt-4 p-3 bg-red-50 text-red-700 text-sm rounded-lg border border-red-200">{error}</div>}
              {entryMode === 'manual' && (
              <div className="overflow-y-auto flex-1 no-scrollbar p-6 space-y-6">
                <section>
                  <p className="text-xs font-bold tracking-widest uppercase text-gray-500 mb-3">{involvedUsers[currentUserId] ? 'With you and:' : 'With:'}</p>
                  <button onClick={() => setStep('friends')} className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3.5 px-4 flex items-center gap-3 hover:border-[#007A64] transition-colors shadow-sm">
                    <MSIcon name="search" className="text-400 text-xl" />
                    <span className="text-sm text-gray-600 font-medium">
                      {activeIds.filter(id => id !== currentUserId).length > 0
                        ? users.filter(u => involvedUsers[u.id] && u.id !== currentUserId).map(u => u.name).join(', ')
                        : (involvedUsers[currentUserId] ? 'Enter names or email' : 'Select friends')}
                    </span>
                  </button>
                </section>
                <section className="flex items-center gap-5">
                  <div className="relative">
                    <button className="w-16 h-16 rounded-2xl bg-[#EAF5F2] flex items-center justify-center border border-[#007A64]/30">
                      <MSIcon name="receipt_long" className="text-[#007A64] text-3xl" />
                    </button>
                    <div className="absolute -bottom-1 -right-1 bg-[#007A64] rounded-full w-6 h-6 flex items-center justify-center border-2 border-white">
                      <MSIcon name="expand_more" className="text-white" style={{ fontSize: 14 }} />
                    </div>
                  </div>
                  <div className="flex-1">
                    <input type="text" value={description} onChange={e => setDescription(e.target.value)} placeholder="Enter a description"
                      className="w-full bg-transparent border-b-2 border-gray-300 focus:border-[#007A64] py-2 text-xl font-bold text-gray-900 placeholder:text-gray-400 outline-none transition-colors" />
                  </div>
                </section>
                <section className="text-center py-6">
                  <div className="inline-flex items-center gap-2">
                    <span className="text-3xl font-medium text-gray-400">$</span>
                    <input type="number" min="0" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00"
                      className="w-48 bg-transparent text-center text-[56px] font-bold text-gray-900 placeholder:text-gray-300 outline-none border-none focus:ring-0"
                      style={{ fontVariantNumeric: 'tabular-nums' }} />
                  </div>
                </section>
                <section className="pb-4 border-b border-gray-100">
                  <div className="flex items-center justify-center flex-wrap gap-2 text-sm font-medium text-gray-600">
                    <span>Paid by</span>
                    <div className="relative inline-block w-48 text-left">
                      <CustomDropdown
                        value={payerId}
                        onChange={(val) => setPayerId(parseInt(val))}
                        options={users.map(u => ({ value: u.id }))}
                        className="!w-full"
                        renderSelected={(opt) => {
                           const u = users.find(usr => usr.id === opt.value);
                           return (
                              <>
                                 <div className={clsx("w-6 h-6 rounded-full flex items-center justify-center font-bold text-white text-[10px]", avatarColor(opt.value))}>
                                    {initials(u?.name || 'U')}
                                 </div>
                                 <span className="font-medium text-gray-900 text-sm whitespace-nowrap overflow-hidden text-ellipsis">{u?.id === currentUserId ? 'You' : u?.name}</span>
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
                                 <span className="flex-1 font-medium text-sm">{u?.id === currentUserId ? `${u?.name} (You)` : u?.name}</span>
                                 <div className={clsx("w-5 h-5 rounded-full border-2 flex items-center justify-center mr-2 shrink-0", isSelected ? "border-[#007A64]" : "border-gray-300")}>
                                    {isSelected && <div className="w-2.5 h-2.5 rounded-full bg-[#007A64]" />}
                                 </div>
                              </>
                           );
                        }}
                      />
                    </div>
                    <span>and split</span>
                    <button onClick={() => setStep('split')} className="bg-[#EAF5F2] border border-[#007A64]/30 text-[#007A64] font-bold px-4 py-2 rounded-lg hover:bg-[#007A64]/20 transition-colors text-sm active:scale-95">{splitLabel}</button>
                  </div>
                </section>
                <section className="flex justify-around items-center pt-2 pb-6">
                  {[{ icon: 'calendar_today', label: 'Today' }, { icon: 'notes', label: 'Note' }, { icon: 'photo_camera', label: 'Camera' }].map(({ icon, label }) => (
                    <button key={label} className="flex flex-col items-center gap-2 group">
                      <div className="w-12 h-12 rounded-full border border-gray-200 flex items-center justify-center group-hover:bg-[#EAF5F2] group-hover:border-[#007A64] group-hover:text-[#007A64] transition-colors text-gray-500">
                        <MSIcon name={icon} className="text-xl transition-colors" />
                      </div>
                      <span className="text-xs font-medium text-gray-500">{label}</span>
                    </button>
                  ))}
                </section>
              </div>
              )}
              {entryMode === 'scan' && (
                <div className="flex-1 p-6 flex flex-col items-center justify-center space-y-6 py-12">
                  <div className="w-full max-w-sm rounded-2xl border-2 border-dashed border-gray-300 p-8 flex flex-col items-center text-center bg-gray-50/50">
                    <MSIcon name="cloud_upload" className="text-gray-400 text-5xl mb-4" />
                    <p className="text-gray-900 font-bold mb-2">Upload or capture receipt</p>
                    <p className="text-sm text-gray-500 mb-6">Supports JPG, PNG</p>
                    
                    <label className={clsx(
                      "text-white font-bold py-3 px-6 rounded-xl transition-colors cursor-pointer w-full text-center block",
                      isProcessingReceipt ? "bg-[#007A64]/50 cursor-not-allowed" : "bg-[#007A64] hover:bg-[#006150]"
                    )}>
                      {isProcessingReceipt ? (
                        <span className="flex items-center justify-center gap-2">
                          <MSIcon name="sync" className="animate-spin" /> Processing...
                        </span>
                      ) : 'Choose File or Camera'}
                      <input type="file" accept="image/*,application/pdf" capture="environment" className="hidden" disabled={isProcessingReceipt} onChange={handleFileUpload} />
                    </label>
                  </div>
                  
                  <div className="w-full max-w-sm">
                    <p className="text-xs font-bold tracking-widest uppercase text-gray-500 mb-3 text-left">Who is involved?</p>
                    <button onClick={() => setStep('friends')} className="w-full bg-white border border-gray-200 rounded-xl py-3 px-4 flex items-center justify-between hover:border-[#007A64] transition-colors shadow-sm">
                      <span className="text-sm text-gray-600 font-medium truncate">
                        {activeIds.length > 1
                          ? users.filter(u => involvedUsers[u.id]).map(u => u.id === currentUserId ? 'You' : u.name).join(', ')
                          : 'Select friends'}
                      </span>
                      <MSIcon name="group_add" className="text-gray-400" />
                    </button>
                    <p className="text-xs text-gray-400 mt-2 text-center">You'll be able to assign items to specific people after scanning.</p>
                  </div>
                </div>
              )}
            </>
          )}

          {step === 'friends' && (
            <SelectFriendsStep users={users} currentUserId={currentUserId} involvedUsers={involvedUsers}
              setInvolvedUsers={setInvolvedUsers} onBack={() => setStep('add')} onDone={() => setStep('add')} />
          )}

          {step === 'split' && (
            <SplitOptionsStep users={users} currentUserId={currentUserId} total={total} activeIds={activeIds}
              splitMethod={splitMethod} setSplitMethod={setSplitMethod} customValues={customValues}
              setCustomValues={setCustomValues} preview={preview} runningSum={runningSum} pctSum={pctSum}
              validationMsg={validationMsg} onBack={() => setStep('add')} onSave={() => setStep('add')} />
          )}
        </div>
      </div>
      <style>{`@keyframes slideUp { from { transform: translateY(24px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }`}</style>
    </>
  );
}

function SelectFriendsStep({ users, currentUserId, involvedUsers, setInvolvedUsers, onBack, onDone }) {
  const [query, setQuery] = useState('');
  const filtered = users.filter(u => {
     const nameStr = u.id === currentUserId ? `${u.name} (You)` : u.name;
     return nameStr.toLowerCase().includes(query.toLowerCase()) || (u.email ?? '').toLowerCase().includes(query.toLowerCase());
  });
  const selectedCount = users.filter(u => involvedUsers[u.id]).length;
  const grouped = filtered.reduce((acc, u) => { 
     const l = u.id === currentUserId ? 'Y' : u.name[0].toUpperCase(); 
     if (!acc[l]) acc[l] = []; 
     acc[l].push(u); 
     return acc; 
  }, {});
  const toggle = (id) => setInvolvedUsers(prev => ({ ...prev, [id]: !prev[id] }));
  
  return (
    <>
      <header className="sticky top-0 bg-white border-b border-gray-200 flex items-center justify-between px-5 h-16 z-10">
        <button onClick={onBack} className="p-2 -ml-2 rounded-full hover:bg-gray-100 active:scale-95 transition-all"><MSIcon name="arrow_back" className="text-[#007A64] text-xl" /></button>
        <h1 className="font-bold text-lg text-gray-900">Select friends</h1>
        <button onClick={onDone} className="font-bold text-sm text-[#007A64] px-4 py-2 rounded-lg hover:bg-[#EAF5F2] active:scale-95 transition-all">Save</button>
      </header>
      <div className="overflow-y-auto flex-1 no-scrollbar px-6 pt-6 pb-24">
        <div className="relative mb-6">
          <MSIcon name="search" className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-xl" />
          <input type="text" value={query} onChange={e => setQuery(e.target.value)} placeholder="Enter a name, email, or phone"
            className="w-full h-12 bg-gray-100 rounded-xl pl-12 pr-4 border-none outline-none text-sm text-gray-900 placeholder:text-gray-500 focus:ring-2 focus:ring-[#007A64]" />
        </div>
        {Object.keys(grouped).sort().length > 0 && (
          <section>
            <h2 className="text-xs font-bold tracking-widest uppercase text-gray-500 mb-3">All Friends</h2>
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm divide-y divide-gray-100 overflow-hidden">
              {Object.keys(grouped).sort((a,b) => a === 'Y' && grouped[a].some(u => u.id === currentUserId) ? -1 : b === 'Y' && grouped[b].some(u => u.id === currentUserId) ? 1 : a.localeCompare(b)).map(letter => (
                <React.Fragment key={letter}>
                  <div className="px-5 py-2 bg-gray-50 text-xs font-bold text-gray-500">
                     {letter === 'Y' && grouped[letter].some(u => u.id === currentUserId) ? 'YOU' : letter}
                  </div>
                  {grouped[letter].map(u => (
                    <div key={u.id} onClick={() => toggle(u.id)} className={clsx("flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors cursor-pointer", involvedUsers[u.id] && "bg-[#EAF5F2]")}>
                      <div className="flex items-center gap-4">
                        <div className={clsx('w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shadow-sm', avatarColor(u.id))}>{initials(u.name)}</div>
                        <div><p className="font-bold text-gray-900 text-sm">{u.id === currentUserId ? `${u.name} (You)` : u.name}</p>{u.email && <p className="text-xs text-gray-500">{u.email}</p>}</div>
                      </div>
                      <MSIcon name={involvedUsers[u.id] ? "check_box" : "check_box_outline_blank"} fill={involvedUsers[u.id] ? 1 : 0} className={clsx("text-2xl", involvedUsers[u.id] ? "text-[#007A64]" : "text-gray-300")} />
                    </div>
                  ))}
                </React.Fragment>
              ))}
            </div>
          </section>
        )}
      </div>
      <div className="absolute bottom-6 right-6">
        <button onClick={onDone} className="bg-[#007A64] hover:bg-[#00604f] text-white h-14 px-8 rounded-full shadow-lg flex items-center gap-3 active:scale-95 transition-all font-bold text-sm tracking-wider uppercase">
          Done {selectedCount > 0 && `(${selectedCount})`} <MSIcon name="check" className="text-xl" />
        </button>
      </div>
    </>
  );
}

function SplitOptionsStep({ users, currentUserId, total, activeIds, splitMethod, setSplitMethod, customValues, setCustomValues, preview, runningSum, pctSum, validationMsg, onBack, onSave }) {
  const tabs = ['equal', 'unequal', 'percentage'];
  const tabLabels = { equal: 'Equal', unequal: 'Unequal', percentage: 'Percentage' };
  const activeUsers = users.filter(u => activeIds.includes(u.id));
  
  return (
    <>
      <header className="sticky top-0 bg-white border-b border-gray-200 flex items-center justify-between px-5 h-16 z-10">
        <button onClick={onBack} className="p-2 -ml-2 rounded-full hover:bg-gray-100 active:scale-95 transition-all"><MSIcon name="arrow_back" className="text-[#007A64] text-xl" /></button>
        <h1 className="font-bold text-lg text-gray-900">Split options</h1>
        <button onClick={onSave} className="font-bold text-sm text-[#007A64] px-4 py-2 rounded-lg hover:bg-[#EAF5F2] active:scale-95 transition-all">Save</button>
      </header>
      <div className="overflow-y-auto flex-1 no-scrollbar pb-32">
        <section className="text-center px-6 py-8 bg-gray-50 border-b border-gray-200">
          <p className="text-xs font-bold tracking-widest uppercase text-gray-500 mb-2">Total Amount</p>
          <h2 className="text-5xl font-bold text-[#007A64]" style={{ fontVariantNumeric: 'tabular-nums' }}>${total > 0 ? total.toFixed(2) : '0.00'}</h2>
        </section>
        <section className="px-6 py-6">
          <div className="bg-gray-100 p-1.5 rounded-xl flex items-center h-12 border border-gray-200 mb-6">
            {tabs.map(key => (
              <button key={key} onClick={() => { setSplitMethod(key); setCustomValues({}); }}
                className={clsx('flex-1 h-full rounded-lg text-xs font-bold transition-all uppercase tracking-wide', splitMethod === key ? 'bg-white text-[#007A64] shadow-sm' : 'text-gray-500 hover:text-gray-900')}>
                {tabLabels[key]}
              </button>
            ))}
          </div>
          
          {splitMethod !== 'equal' && total > 0 && (
            <div className={clsx("rounded-xl px-5 py-4 flex items-center justify-between mb-6 border", validationMsg ? "bg-red-50 border-red-200" : "bg-gray-50 border-gray-200")}>
              <div className="flex items-center gap-3">
                <MSIcon name="info" className={clsx("text-lg", validationMsg ? "text-red-500" : "text-gray-500")} />
                <span className={clsx("text-sm font-medium", validationMsg ? "text-red-600" : "text-gray-700")}>
                  {splitMethod === 'percentage' ? `${pctSum?.toFixed(1) ?? 0}% of 100%` : `Remaining: $${(total - runningSum).toFixed(2)}`}
                </span>
              </div>
              <span className={clsx("text-xs font-bold tracking-widest uppercase", validationMsg ? "text-red-600" : "text-[#007A64]")}>
                {validationMsg ? 'ERROR' : Math.abs(runningSum - total) < 0.01 && runningSum > 0 ? 'READY' : 'PENDING'}
              </span>
            </div>
          )}
          
          <div className="space-y-3">
            {activeUsers.map(u => {
              const isMe = u.id === currentUserId;
              const share = preview[u.id] ?? 0;
              return (
                <div key={u.id} className="bg-white border border-gray-200 rounded-xl px-5 py-4 flex items-center justify-between shadow-sm">
                  <div className="flex items-center gap-4">
                    <div className={clsx('w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shadow-sm', avatarColor(u.id))}>{initials(u.name)}</div>
                    <div>
                      <p className="font-bold text-sm text-gray-900">{isMe ? 'You' : u.name}</p>
                      <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wide mt-0.5">{isMe ? `Paid $${total.toFixed(2)}` : 'Lent $0.00'}</p>
                    </div>
                  </div>
                  {splitMethod === 'equal' && <span className="text-[15px] font-bold text-[#007A64]">${share.toFixed(2)}</span>}
                  {splitMethod === 'unequal' && (
                    <div className="relative w-32">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-sm">$</span>
                      <input type="number" min="0" step="0.01" placeholder="0.00" value={customValues[u.id] || ''}
                        onChange={e => setCustomValues(prev => ({ ...prev, [u.id]: e.target.value }))}
                        className="w-full bg-gray-50 border border-gray-200 rounded-lg pl-8 pr-3 py-2 text-right font-bold text-[#007A64] focus:ring-2 focus:ring-[#007A64] focus:bg-white transition-all outline-none text-sm" />
                    </div>
                  )}
                  {splitMethod === 'percentage' && (
                    <div className="flex items-center gap-1">
                      <input type="number" min="0" max="100" step="1" placeholder="0" value={customValues[u.id] || ''}
                        onChange={e => setCustomValues(prev => ({ ...prev, [u.id]: e.target.value }))}
                        className="w-16 bg-transparent border-b-2 border-gray-300 focus:border-[#007A64] py-1 text-right font-bold text-gray-900 outline-none transition-colors text-xl"
                        style={{ fontVariantNumeric: 'tabular-nums' }} />
                      <span className="text-lg text-gray-400 font-bold">%</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          
          {splitMethod === 'percentage' && total > 0 && (
            <div className="mt-8">
              <div className="flex items-center justify-between mb-2">
                <div className={clsx("flex items-center gap-1.5 text-sm font-bold", validationMsg ? "text-red-600" : "text-[#007A64]")}>
                  {validationMsg && <MSIcon name="error" className="text-base" />}
                  Total: {pctSum?.toFixed(0) ?? 0}%
                </div>
                <span className="text-xs font-bold tracking-wide uppercase text-gray-500">{Math.max(0, 100 - (pctSum ?? 0)).toFixed(0)}% remaining</span>
              </div>
              <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                <div className={clsx("h-full rounded-full transition-all", validationMsg ? "bg-red-500" : "bg-[#007A64]")} style={{ width: `${Math.min(pctSum ?? 0, 100)}%` }} />
              </div>
            </div>
          )}
        </section>
      </div>
      <div className="absolute bottom-0 left-0 w-full bg-white/90 backdrop-blur-md p-5 border-t border-gray-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
        <button onClick={onSave} disabled={splitMethod !== 'equal' && !!validationMsg}
          className={clsx("w-full h-14 font-bold text-lg rounded-xl transition-all shadow-md flex items-center justify-center gap-2 active:scale-[0.98]",
            (splitMethod === 'equal' || !validationMsg) ? "bg-[#007A64] hover:bg-[#00604f] text-white" : "bg-gray-100 text-gray-400 cursor-not-allowed shadow-none")}>
          Apply Split
        </button>
      </div>
    </>
  );
}
