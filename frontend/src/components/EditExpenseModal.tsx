import { useState } from 'react';
import clsx from 'clsx';
import MSIcon from './MSIcon';
import CustomDropdown from './CustomDropdown';
import ExpenseDeleteDialog from './ExpenseDeleteDialog';
import SplitEditor from './EditExpense/SplitEditor';
import { avatarColor, initials } from '../lib/utils';
import { useUpdateExpense } from '../features/expenses/api';
import { usePlans } from '../features/preplanning/api';
import { buildEqualSplits, parseAmount } from '../features/expenses/splitUtils';
import type { EditSplitMethod } from './EditExpense/SplitEditor';
import type { ExpenseCategory, ExpenseCreate, ExpenseWithCreator, User } from '../types/api';
import type { StringById } from '../types/ui';

interface EditExpenseModalProps {
  expense: ExpenseWithCreator;
  users: User[];
  currentUserId: number;
  onClose: () => void;
  onSave: () => void;
  onDeleted: () => void;
}

interface CategoryOption {
  value: ExpenseCategory;
  label: string;
  icon: string;
}

export default function EditExpenseModal({ expense, users, currentUserId, onClose, onSave, onDeleted }: EditExpenseModalProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [description, setDescription] = useState(expense.description || '');
  const [amount, setAmount] = useState((expense.total_amount || 0).toString());
  const [date, setDate] = useState(expense.date ? expense.date.split('T')[0] : new Date().toISOString().split('T')[0]);
  const [category, setCategory] = useState<ExpenseCategory>((expense.category as ExpenseCategory | null) || 'General');
  const [splitMethod, setSplitMethod] = useState<EditSplitMethod>('Equally');
  const [planId, setPlanId] = useState<number | ''>(expense.plan_id || '');
  const plansQuery = usePlans();
  const plans = plansQuery.data ?? [];
  const updateExpense = useUpdateExpense();
  const isItemizedReceipt = Boolean(expense.receipt_breakdown);

  const payerPart = expense.participants?.find(p => p.amount_paid > 0) || expense.participants?.[0];
  const [payerId, setPayerId] = useState(payerPart ? payerPart.user_id : currentUserId);
  const [splits, setSplits] = useState<StringById>(() => {
    const initialSplits: StringById = {};
    expense.participants?.forEach(p => {
      initialSplits[p.user_id] = (p.amount_owed || 0).toFixed(2);
    });
    return initialSplits;
  });
  const [hasReceipt, setHasReceipt] = useState(expense.has_receipt || false);

  const handleAmountChange = (value: string) => {
    setAmount(value);
    if (splitMethod === 'Equally') {
      setSplits(buildEqualSplits(expense.participants ?? [], parseAmount(value)));
    }
  };

  const handleSplitMethodChange = (newMethod: EditSplitMethod) => {
    if (newMethod === splitMethod) return;

    const parsedAmount = parseAmount(amount);
    const count = expense.participants?.length || 1;

    if (newMethod === 'Equally') {
      setSplits(buildEqualSplits(expense.participants ?? [], parsedAmount));
    } else if (newMethod === 'Unequally' && splitMethod === 'Shares') {
      const newSplits: StringById = {};
      expense.participants?.forEach(p => {
        const pct = parseAmount(splits[p.user_id]);
        newSplits[p.user_id] = ((pct / 100) * parsedAmount).toFixed(2);
      });
      setSplits(newSplits);
    } else if (newMethod === 'Shares') {
      const newSplits: StringById = {};
      expense.participants?.forEach(p => {
        const dollarVal = parseAmount(splits[p.user_id]);
        const pct = parsedAmount > 0 ? (dollarVal / parsedAmount) * 100 : (100 / count);
        newSplits[p.user_id] = pct.toFixed(1);
      });
      setSplits(newSplits);
    }

    setSplitMethod(newMethod);
  };

  const handleSave = async () => {
    const parsedAmount = parseAmount(amount);
    const participants = (expense.participants || []).map(p => ({
      user_id: p.user_id,
      amount_paid: p.user_id === payerId ? parsedAmount : 0,
      amount_owed: splitMethod === 'Shares'
        ? (parseAmount(splits[p.user_id]) / 100) * parsedAmount
        : parseAmount(splits[p.user_id])
    }));

    const payload: ExpenseCreate = {
      group_id: expense.group_id,
      plan_id: planId ? Number(planId) : null,
      description,
      total_amount: parsedAmount,
      currency: 'USD',
      date: date ? new Date(date).toISOString() : new Date().toISOString(),
      category,
      has_receipt: hasReceipt,
      receipt_breakdown: hasReceipt ? expense.receipt_breakdown ?? null : null,
      participants
    };

    try {
      await updateExpense.mutateAsync({ expenseId: expense.id, currentUserId, payload });
      onSave();
    } catch(e) {
      console.error("Error saving expense", e);
    }
  };

  const totalAccounted = Object.values(splits || {}).reduce((sum, val) => sum + parseAmount(val), 0);
  const parsedAmount = parseAmount(amount);
  const isPerfectSplit = splitMethod === 'Shares'
    ? Math.abs(totalAccounted - 100) < 0.1
    : Math.abs(totalAccounted - parsedAmount) < 0.01;
  const categoryOptions = [
    { value: 'Entertainment', label: 'Entertainment', icon: 'local_bar' },
    { value: 'Dining', label: 'Dining', icon: 'restaurant' },
    { value: 'Groceries', label: 'Groceries', icon: 'shopping_cart' },
    { value: 'Transport', label: 'Transport', icon: 'flight' },
    { value: 'Accommodation', label: 'Accommodation', icon: 'hotel' },
    { value: 'General', label: 'General', icon: 'category' }
  ] satisfies CategoryOption[];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm" onClick={onClose} />
      <div className="bg-[#F8F9FA] rounded-2xl w-full max-w-5xl max-h-[90vh] flex flex-col relative shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-8 py-6 border-b border-gray-200 bg-white shrink-0 relative">
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center text-gray-500 hover:text-gray-900 transition-colors z-10">
            <MSIcon name="close" className="text-2xl" />
          </button>
          <h2 className="text-2xl font-bold text-gray-900 absolute left-1/2 -translate-x-1/2">Edit Expense</h2>
          <button onClick={handleSave} className="text-[#007A64] font-bold text-sm hover:underline transition-opacity disabled:opacity-50 z-10" disabled={!isPerfectSplit || updateExpense.isPending}>
            {updateExpense.isPending ? 'Saving...' : 'Save'}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-8">
          <div className="flex flex-col lg:flex-row gap-8">
            <div className="flex-1 space-y-6">
              <div className="space-y-4">
                {/* Combined Description & Amount Block */}
                <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm flex flex-col">
                  {/* Top: Description */}
                  <div className="flex items-center gap-4 pb-6 border-b border-gray-100">
                    <div className="w-12 h-12 rounded-full border border-gray-200 flex items-center justify-center shrink-0 text-gray-500">
                      <MSIcon name="local_bar" className="text-xl" />
                    </div>
                    <div className="flex flex-col flex-1">
                      <label className="block text-[11px] font-bold tracking-widest uppercase text-gray-500 mb-1">Description</label>
                      <input 
                        type="text" 
                        value={description} 
                        onChange={e => setDescription(e.target.value)} 
                        placeholder="Expense description"
                        className="w-full text-xl font-medium text-gray-900 bg-transparent outline-none placeholder:text-gray-400" 
                      />
                    </div>
                  </div>
                  
                  {/* Bottom: Amount */}
                  <div className="pt-6 flex flex-col">
                    <label className="block text-[11px] font-bold tracking-widest uppercase text-gray-500 mb-2">Amount</label>
                    <div className="flex items-center">
                      <span className="text-3xl text-gray-400 font-bold mr-2">$</span>
                      <input 
                        type="number" 
                        value={amount} 
                        onChange={e => handleAmountChange(e.target.value)} 
                        disabled={isItemizedReceipt} 
                        className="w-full text-[56px] leading-none font-black text-[#007A64] bg-transparent outline-none disabled:opacity-50" 
                        placeholder="0.00"
                        style={{ fontVariantNumeric: 'tabular-nums' }}
                      />
                    </div>
                    {isItemizedReceipt && (
                      <p className="text-xs font-medium text-gray-500 mt-4">Edit the receipt split from the expense detail screen.</p>
                    )}
                  </div>
                </div>

                {/* Date and Category */}
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1 bg-white rounded-2xl border border-gray-200 p-4 shadow-sm flex items-center gap-4">
                    <MSIcon name="calendar_today" className="text-gray-400 text-xl shrink-0" />
                    <div className="flex flex-col flex-1">
                      <label className="block text-[10px] font-bold tracking-widest uppercase text-gray-500 mb-0.5">Date</label>
                      <input 
                        type="date" 
                        value={date} 
                        onChange={e => setDate(e.target.value)} 
                        className="w-full outline-none text-gray-900 font-medium bg-transparent" 
                      />
                    </div>
                  </div>
                  <div className="flex-1 bg-white rounded-2xl border border-gray-200 p-4 shadow-sm flex items-center gap-4 relative z-20">
                    <MSIcon name="category" className="text-gray-400 text-xl shrink-0" />
                    <div className="flex flex-col flex-1 w-full overflow-hidden">
                      <label className="block text-[10px] font-bold tracking-widest uppercase text-gray-500 mb-0.5">Category</label>
                      <CustomDropdown
                        value={category}
                        onChange={setCategory}
                        options={categoryOptions}
                        className="!p-0 border-none bg-transparent"
                        renderSelected={(opt) => (
                          <span className="font-medium text-gray-900">{opt.label}</span>
                        )}
                        renderOption={(opt, isSelected) => (
                          <>
                            <MSIcon name={opt.icon} className={isSelected ? "text-[#007A64]" : "text-gray-500"} />
                            <span className="flex-1 font-medium ml-3 text-gray-900">{opt.label}</span>
                            {isSelected && <MSIcon name="check" className="text-[#007A64] text-sm shrink-0" />}
                          </>
                        )}
                      />
                    </div>
                  </div>
                </div>

                {/* Paid By & Linked Plan */}
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1 bg-white rounded-2xl border border-gray-200 p-4 shadow-sm flex items-center gap-4">
                     <MSIcon name="account_balance_wallet" className="text-gray-400 text-xl shrink-0" />
                     <div className="flex items-center justify-between flex-1 relative z-10">
                       <label className="block text-[14px] font-medium text-gray-600">Paid by</label>
                       <div className="relative">
                          <CustomDropdown
                            value={payerId}
                            onChange={(val) => setPayerId(Number(val))}
                            options={(expense.participants || []).map(p => ({ value: p.user_id }))}
                            className="rounded-full py-1.5 px-3 bg-gray-50 border border-gray-200 shadow-sm text-gray-900"
                            renderSelected={(opt) => {
                              const u = users.find(usr => usr.id === opt.value);
                              return (
                                <div className="flex items-center gap-2">
                                  <div className={clsx("w-5 h-5 rounded-full flex items-center justify-center font-bold text-white text-[9px]", avatarColor(opt.value))}>
                                    {initials(u?.name || 'U')}
                                  </div>
                                  <span className="font-bold text-gray-900 text-xs truncate max-w-[80px]">{u?.id === currentUserId ? 'You' : u?.name}</span>
                                </div>
                              );
                            }}
                            renderOption={(opt, isSelected) => {
                              const u = users.find(usr => usr.id === opt.value);
                              return (
                                <>
                                  <div className={clsx("w-6 h-6 rounded-full flex items-center justify-center font-bold text-white text-[10px]", avatarColor(opt.value))}>
                                    {initials(u?.name || 'U')}
                                  </div>
                                  <span className="flex-1 font-medium text-sm ml-3 truncate text-gray-900">{u?.id === currentUserId ? `${u?.name} (You)` : u?.name}</span>
                                  {isSelected && <MSIcon name="check" className="text-[#007A64] text-sm shrink-0" />}
                                </>
                              );
                            }}
                          />
                       </div>
                     </div>
                  </div>

                  <div className="flex-1 bg-white rounded-2xl border border-gray-200 p-4 shadow-sm flex items-center gap-4">
                     <MSIcon name="event_note" className="text-gray-400 text-xl shrink-0" />
                     <div className="flex items-center justify-between flex-1 relative z-10">
                       <label className="block text-[14px] font-medium text-gray-600">Linked Plan</label>
                       <div className="relative">
                          <CustomDropdown
                            value={planId}
                            onChange={(val) => setPlanId(val)}
                            options={[{ value: '', label: 'None' }, ...plans.map(p => ({ value: p.id, label: p.name }))]}
                            className="rounded-full py-1.5 px-3 bg-gray-50 border border-gray-200 shadow-sm text-gray-900"
                            renderSelected={(opt) => <span className="font-bold text-gray-900 text-xs truncate max-w-[80px]">{opt.label}</span>}
                            renderOption={(opt, isSelected) => (
                              <>
                                <span className="flex-1 font-medium text-sm truncate text-gray-900">{opt.label}</span>
                                {isSelected && <MSIcon name="check" className="text-[#007A64] text-sm shrink-0" />}
                              </>
                            )}
                          />
                       </div>
                     </div>
                  </div>
                </div>
              </div>

              {isItemizedReceipt ? (
                <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#EAF5F2] text-[#007A64] flex items-center justify-center shrink-0">
                      <MSIcon name="receipt_long" className="text-xl" />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900">Receipt itemization controls this split</h3>
                      <p className="text-sm text-gray-500 mt-1">Use Edit Split in the receipt breakdown to change item assignments, tax, tip, and participant totals together.</p>
                    </div>
                  </div>
                </div>
              ) : (
                <SplitEditor
                  expense={expense}
                  users={users}
                  splitMethod={splitMethod}
                  splits={splits}
                  totalAccounted={totalAccounted}
                  parsedAmount={parsedAmount}
                  isPerfectSplit={isPerfectSplit}
                  onSplitMethodChange={handleSplitMethodChange}
                  onSplitChange={(userId, value) => setSplits(prev => ({ ...prev, [userId]: value }))}
                />
              )}

              <div className="mt-8">
                <h3 className="font-bold text-gray-900 text-2xl mb-4">Receipt</h3>
                {hasReceipt ? (
                  <div className="bg-white border border-gray-200 rounded-2xl p-4 flex items-center justify-between shadow-sm">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 rounded-xl bg-gray-100 overflow-hidden shrink-0 border border-gray-200">
                        <img src="https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&q=80&w=100" alt="Receipt thumbnail" className="w-full h-full object-cover" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-gray-900 font-medium text-base">rooftop_receipt.jpg</span>
                        <span className="text-gray-500 text-xs font-medium">Added by You</span>
                      </div>
                    </div>
                    <button onClick={() => setHasReceipt(false)} className="w-10 h-10 flex items-center justify-center text-gray-400 hover:text-[#D93F3C] transition-colors rounded-full hover:bg-red-50">
                      <MSIcon name="delete_outline" className="text-xl" />
                    </button>
                  </div>
                ) : (
                  <div className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-2xl p-6 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-gray-100 hover:border-[#007A64] transition-colors group" onClick={() => setHasReceipt(true)}>
                    <MSIcon name="cloud_upload" className="text-3xl text-gray-400 group-hover:text-[#007A64] mb-2" />
                    <p className="text-sm font-medium text-gray-600 group-hover:text-[#007A64]">Click to add receipt</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="mt-8">
            <button onClick={() => setShowDeleteConfirm(true)} className="w-full flex items-center justify-center gap-2 text-[#D93F3C] border border-[#D93F3C]/30 hover:bg-[#D93F3C]/5 font-bold text-sm rounded-xl py-4 transition-colors">
              <MSIcon name="delete_outline" className="text-lg" />
              Delete Expense
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
    </div>
  );
}
