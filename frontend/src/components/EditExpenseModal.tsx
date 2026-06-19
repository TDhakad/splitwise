import { useState } from 'react';
import clsx from 'clsx';
import MSIcon from './MSIcon';
import CustomDropdown from './CustomDropdown';
import ExpenseDeleteDialog from './ExpenseDeleteDialog';
import ReceiptPanel from './EditExpense/ReceiptPanel';
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
        <div className="flex items-center justify-between px-8 py-6 border-b border-gray-200 bg-white shrink-0">
          <div className="flex items-center gap-4">
            <button onClick={onClose} className="w-10 h-10 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-100 hover:text-gray-900 transition-colors">
              <MSIcon name="close" className="text-xl" />
            </button>
            <h2 className="text-2xl font-bold text-gray-900">Edit Expense</h2>
          </div>
          <div className="flex items-center gap-4">
            <button onClick={onClose} className="text-[#007A64] font-bold text-sm hover:underline">Cancel</button>
            <button onClick={handleSave} className="px-6 py-2.5 bg-[#007A64] hover:bg-[#00604f] text-white rounded-full font-bold text-sm transition-colors shadow-sm disabled:opacity-50" disabled={!isPerfectSplit || updateExpense.isPending}>
              {updateExpense.isPending ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-8">
          <div className="flex flex-col lg:flex-row gap-8">
            <div className="flex-1 space-y-6">
              <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-6">
                <div className="flex gap-6">
                  <div className="flex-1">
                    <label className="block text-[11px] font-bold tracking-widest uppercase text-gray-500 mb-2">Amount</label>
                    <div className="flex items-center border-b border-gray-300 pb-2 focus-within:border-[#007A64] transition-colors">
                      <span className="text-2xl text-gray-400 mr-2">$</span>
                      <input type="number" value={amount} onChange={e => handleAmountChange(e.target.value)} className="w-full text-4xl font-bold text-gray-900 bg-transparent outline-none" />
                    </div>
                  </div>
                  <div className="flex-1">
                    <label className="block text-[11px] font-bold tracking-widest uppercase text-gray-500 mb-2">Description</label>
                    <div className="flex items-center border-b border-gray-300 pb-2 focus-within:border-[#007A64] transition-colors h-full">
                      <input type="text" value={description} onChange={e => setDescription(e.target.value)} className="w-full text-xl font-medium text-gray-900 bg-transparent outline-none" />
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
                      options={categoryOptions}
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
                    onChange={(val) => setPayerId(Number(val))}
                    options={(expense.participants || []).map(p => ({ value: p.user_id }))}
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

                <div>
                  <label className="block text-[11px] font-bold tracking-widest uppercase text-gray-500 mb-2">Linked Plan</label>
                  <CustomDropdown
                    value={planId}
                    onChange={(val) => setPlanId(val)}
                    options={[{ value: '', label: 'None' }, ...plans.map(p => ({ value: p.id, label: p.name }))]}
                    renderSelected={(opt) => <span className="font-medium text-gray-900">{opt.label}</span>}
                    renderOption={(opt, isSelected) => (
                      <>
                        <span className="flex-1 font-medium">{opt.label}</span>
                        {isSelected && <MSIcon name="check" className="text-[#007A64] text-sm" />}
                      </>
                    )}
                  />
                </div>
              </div>

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
            </div>

            <ReceiptPanel hasReceipt={hasReceipt} onHasReceiptChange={setHasReceipt} />
          </div>

          <div className="mt-8 flex justify-center">
            <button onClick={() => setShowDeleteConfirm(true)} className="flex items-center gap-2 text-[#D93F3C] font-bold text-sm hover:underline px-4 py-2">
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
