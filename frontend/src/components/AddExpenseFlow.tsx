import { useState } from 'react';
import clsx from 'clsx';
import MSIcon from './MSIcon';
import ReviewReceiptStep from './ReviewReceiptStep';
import ItemizedSplitStep from './ItemizedSplitStep';
import ManualExpenseEntry from './AddExpense/ManualExpenseEntry';
import ScanReceiptEntry from './AddExpense/ScanReceiptEntry';
import SelectFriendsStep from './AddExpense/SelectFriendsStep';
import SplitOptionsStep from './AddExpense/SplitOptionsStep';
import { apiFetch, getErrorMessage } from '../lib/constants';
import { useCreateExpense } from '../features/expenses/api';
import { buildExpenseParticipants, calculateSplitPreview, getSplitValidation, parseAmount } from '../features/expenses/splitUtils';
import type { ChangeEvent } from 'react';
import type { ExpenseCreate, ExpenseParticipantBase, GroupDetail, Plan, User } from '../types/api';
import type { BooleanById, ExpenseEntryMode, ExpenseStep, ReceiptReviewData, ReceiptScanResponse, SplitMethod, StringById } from '../types/ui';

interface AddExpenseFlowProps {
  users: User[];
  groups: GroupDetail[];
  currentUserId: number;
  groupCtx: GroupDetail | null;
  planCtx: Plan | null;
  onClose: () => void;
  onSave: () => void;
}

export default function AddExpenseFlow({ users, groups, currentUserId, groupCtx, planCtx, onClose, onSave }: AddExpenseFlowProps) {
  const [step, setStep] = useState<ExpenseStep>('add');
  const [entryMode, setEntryMode] = useState<ExpenseEntryMode>('manual');
  const [receiptImage, setReceiptImage] = useState<string | null>(null);
  const [receiptData, setReceiptData] = useState<ReceiptReviewData | null>(null);
  const [isProcessingReceipt, setIsProcessingReceipt] = useState(false);

  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [groupId] = useState(groupCtx ? String(groupCtx.id) : '');
  const [planId] = useState(planCtx ? String(planCtx.id) : '');
  const [payerId, setPayerId] = useState(currentUserId);
  const [splitMethod, setSplitMethod] = useState<SplitMethod>('equal');
  const [involvedUsers, setInvolvedUsers] = useState<BooleanById>({ [currentUserId]: true });
  const [customValues, setCustomValues] = useState<StringById>({});
  const [error, setError] = useState('');
  const createExpense = useCreateExpense();

  const selectedGroup = groupCtx || groups.find(g => g.id === parseInt(groupId));
  const expenseUsers = selectedGroup?.members?.length
    ? selectedGroup.members.map(member => users.find(u => u.id === member.id) || member)
    : users;
  const total = parseAmount(amount);
  const activeIds = expenseUsers.filter(u => involvedUsers[u.id]).map(u => u.id);
  const preview = calculateSplitPreview(splitMethod, total, activeIds, customValues);
  const runningSum = Object.values(preview).reduce((sum, value) => sum + value, 0);
  const pctSum = splitMethod === 'percentage' ? activeIds.reduce((sum, id) => sum + parseAmount(customValues[id]), 0) : null;
  const validationMsg = getSplitValidation(splitMethod, total, activeIds, runningSum, pctSum);
  const canSave = Boolean(description.trim() && total > 0 && activeIds.length > 0 && !validationMsg);
  const splitLabel = splitMethod === 'equal' ? 'Equally' : splitMethod === 'unequal' ? 'Unequally' : 'By %';

  const handleSave = async (participantsOverride: ExpenseParticipantBase[] | null = null, totalOverride: number | null = null) => {
    if (!participantsOverride && !canSave) {
      setError(validationMsg || 'Please fill all fields.');
      return;
    }

    setError('');
    const finalTotal = totalOverride !== null ? totalOverride : total;
    const participants = participantsOverride ?? buildExpenseParticipants(activeIds, payerId, finalTotal, preview);
    const finalDesc = receiptData && !description ? 'Receipt Upload' : description.trim() || 'Receipt Upload';
    const payload: ExpenseCreate = {
      group_id: groupId ? parseInt(groupId) : null,
      plan_id: planId ? parseInt(planId) : null,
      description: finalDesc,
      total_amount: finalTotal,
      currency: 'USD',
      participants,
    };

    try {
      await createExpense.mutateAsync({ currentUserId, payload });
      onSave();
    } catch (e) {
      setError(getErrorMessage(e));
    }
  };

  const handleFileUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessingReceipt(true);
    setError('');

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await apiFetch('/receipts/scan', {
        method: 'POST',
        body: formData,
      });
      if (res.ok) {
        const data = await res.json() as ReceiptScanResponse;
        setReceiptImage(data.image_url);
        setReceiptData(data.data);
        setStep('review-receipt');
      } else {
        const err = await res.json() as { detail?: string };
        setError(err.detail ?? 'Failed to process receipt.');
      }
    } catch {
      setError('Network error processing receipt.');
    } finally {
      setIsProcessingReceipt(false);
    }
  };

  const handleFinishItemizedSplit = (participants: ExpenseParticipantBase[], finalTotal: number) => {
    setAmount(finalTotal.toFixed(2));
    setSplitMethod('unequal');

    const newInvolved: BooleanById = {};
    const newCustomValues: StringById = {};

    participants.forEach(p => {
      newInvolved[p.user_id] = true;
      if (p.amount_owed > 0) {
        newCustomValues[p.user_id] = p.amount_owed.toFixed(2);
      }
    });

    setInvolvedUsers(newInvolved);
    setCustomValues(newCustomValues);
    setEntryMode('manual');
    setStep('add');
    if (!description) setDescription('Receipt Scan');
  };

  if (step === 'review-receipt' && receiptData) {
    return <ReviewReceiptStep receiptImage={receiptImage} receiptData={receiptData} setReceiptData={setReceiptData} onNext={() => setStep('itemized-split')} onClose={onClose} onBack={() => setStep('add')} />;
  }

  if (step === 'itemized-split' && receiptData) {
    return <ItemizedSplitStep receiptData={receiptData} users={expenseUsers} involvedUsers={involvedUsers} currentUserId={currentUserId} payerId={payerId} onSave={handleFinishItemizedSplit} onClose={onClose} onBack={() => setStep('review-receipt')} />;
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
                  <button onClick={() => handleSave()} disabled={createExpense.isPending || !canSave} className={clsx("font-bold text-sm px-4 py-2 rounded-lg transition-all active:scale-95", canSave ? "text-[#007A64] hover:bg-[#EAF5F2]" : "text-gray-400 cursor-not-allowed")}>Save</button>
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
                <ManualExpenseEntry
                  users={expenseUsers}
                  currentUserId={currentUserId}
                  involvedUsers={involvedUsers}
                  activeIds={activeIds}
                  description={description}
                  amount={amount}
                  payerId={payerId}
                  splitLabel={splitLabel}
                  onDescriptionChange={setDescription}
                  onAmountChange={setAmount}
                  onPayerChange={setPayerId}
                  onSelectFriends={() => setStep('friends')}
                  onSelectSplit={() => setStep('split')}
                />
              )}
              {entryMode === 'scan' && (
                <ScanReceiptEntry
                  users={expenseUsers}
                  currentUserId={currentUserId}
                  involvedUsers={involvedUsers}
                  activeIds={activeIds}
                  isProcessingReceipt={isProcessingReceipt}
                  onFileUpload={handleFileUpload}
                  onSelectFriends={() => setStep('friends')}
                />
              )}
            </>
          )}

          {step === 'friends' && (
            <SelectFriendsStep
              users={expenseUsers}
              currentUserId={currentUserId}
              involvedUsers={involvedUsers}
              listLabel={selectedGroup ? 'Group Members' : 'All Friends'}
              setInvolvedUsers={setInvolvedUsers}
              onBack={() => setStep('add')}
              onDone={() => setStep('add')}
            />
          )}

          {step === 'split' && (
            <SplitOptionsStep
              users={expenseUsers}
              currentUserId={currentUserId}
              total={total}
              activeIds={activeIds}
              splitMethod={splitMethod}
              setSplitMethod={setSplitMethod}
              customValues={customValues}
              setCustomValues={setCustomValues}
              preview={preview}
              runningSum={runningSum}
              pctSum={pctSum}
              validationMsg={validationMsg}
              onBack={() => setStep('add')}
              onSave={() => setStep('add')}
            />
          )}
        </div>
      </div>
      <style>{`@keyframes slideUp { from { transform: translateY(24px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }`}</style>
    </>
  );
}
