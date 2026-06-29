import { useState } from 'react';
import clsx from 'clsx';
import MSIcon from './MSIcon';
import ReviewReceiptStep from './ReviewReceiptStep';
import ItemizedSplitStep from './ItemizedSplitStep';
import ManualExpenseEntry from './AddExpense/ManualExpenseEntry';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import ScanReceiptEntry from './AddExpense/ScanReceiptEntry';
import SelectFriendsStep from './AddExpense/SelectFriendsStep';
import SplitOptionsStep from './AddExpense/SplitOptionsStep';
import { apiFetch, getErrorMessage } from '../lib/constants';
import { useCreateExpense } from '../features/expenses/api';
import { usePlans } from '../features/preplanning/api';
import { buildExpenseParticipants, calculateSplitPreview, getSplitValidation, parseAmount, roundPreviewToTotal } from '../features/expenses/splitUtils';
import type { ChangeEvent } from 'react';
import type { ExpenseCreate, ExpenseParticipantBase, GroupDetail, Plan, ReceiptBreakdown, User } from '../types/api';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
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
  const [receiptImage, setReceiptImage] = useState<string | null>(null);
  const [receiptData, setReceiptData] = useState<ReceiptReviewData | null>(null);
  const [receiptBreakdown, setReceiptBreakdown] = useState<ReceiptBreakdown | null>(null);
  const [isProcessingReceipt, setIsProcessingReceipt] = useState(false);

  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [groupId, setGroupId] = useState(groupCtx ? String(groupCtx.id) : '');
  const [planId, setPlanId] = useState(planCtx ? String(planCtx.id) : '');
  const [payerId, setPayerId] = useState(currentUserId);
  const [splitMethod, setSplitMethod] = useState<SplitMethod>('equal');
  const [involvedUsers, setInvolvedUsers] = useState<BooleanById>({ [currentUserId]: true });
  const [customValues, setCustomValues] = useState<StringById>({});
  const [error, setError] = useState('');
  const createExpense = useCreateExpense();
  const { data: plans = [] } = usePlans();

  const selectedGroup = groupCtx || groups.find(g => g.id === parseInt(groupId));
  const expenseUsers = selectedGroup?.members?.length
    ? selectedGroup.members.map(member => users.find(u => u.id === member.id) || member)
    : users;
  const total = parseAmount(amount);
  const activeIds = expenseUsers.filter(u => involvedUsers[u.id]).map(u => u.id);
  const preview = calculateSplitPreview(splitMethod, total, activeIds, customValues);
  const roundedPreview = roundPreviewToTotal(activeIds, total, preview);
  const runningSum = Object.values(preview).reduce((sum, value) => sum + value, 0);
  const pctSum = splitMethod === 'percentage' ? activeIds.reduce((sum, id) => sum + parseAmount(customValues[id]), 0) : null;
  const validationMsg = getSplitValidation(splitMethod, total, activeIds, runningSum, pctSum, customValues);
  const saveBlockReason = !description.trim()
    ? 'Add a description before saving.'
    : total <= 0
      ? 'Enter an amount greater than $0.00.'
      : activeIds.length === 0
        ? 'Select at least one person to split with.'
        : validationMsg;
  const canSave = Boolean(description.trim() && total > 0 && activeIds.length > 0 && !validationMsg);
  
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const splitLabel = splitMethod === 'equal' ? 'Equally' : splitMethod === 'unequal' ? 'Unequally' : 'By %';

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleReset = () => {
    setDescription('');
    setAmount('');
    setPayerId(currentUserId);
    setSplitMethod('equal');
    setInvolvedUsers({ [currentUserId]: true });
    setCustomValues({});
    setError('');
  };

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
      has_receipt: Boolean(receiptData),
      receipt_breakdown: receiptBreakdown,
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

  const handleFinishItemizedSplit = (participants: ExpenseParticipantBase[], finalTotal: number, nextReceiptBreakdown: ReceiptBreakdown) => {
    setAmount(finalTotal.toFixed(2));
    setSplitMethod('unequal');
    setReceiptBreakdown(nextReceiptBreakdown);

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
    setStep('add');
    if (!description) setDescription('Receipt Scan');
  };

  if (step === 'review-receipt' && receiptData) {
    return <ReviewReceiptStep receiptImage={receiptImage} receiptData={receiptData} setReceiptData={setReceiptData} onNext={() => setStep('itemized-split')} onClose={onClose} onBack={() => setStep('add')} />;
  }

  if (step === 'itemized-split' && receiptData) {
    return <ItemizedSplitStep receiptData={receiptData} setReceiptData={setReceiptData} users={expenseUsers} involvedUsers={involvedUsers} currentUserId={currentUserId} payerId={payerId} onSave={handleFinishItemizedSplit} onClose={onClose} onBack={() => setStep('review-receipt')} />;
  }

  const handleBackOrClose = () => {
    if (receiptData) {
      setStep('itemized-split');
    } else {
      onClose();
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40" onClick={handleBackOrClose} />
      <div className="fixed inset-0 z-50 flex items-stretch sm:items-center justify-center sm:p-4">
        <div className="bg-white sm:rounded-3xl w-full sm:max-w-md h-full sm:h-auto shadow-2xl flex flex-col overflow-hidden relative"
          style={{ maxHeight: '100dvh', animation: 'slideUp 0.3s cubic-bezier(0,0,0.2,1)' }}>
          {step === 'add' && (
            <>
              <header className="sticky top-0 w-full z-10 bg-white border-b border-gray-200 flex flex-col px-5 pt-5 sm:pt-4">
                <div className="flex items-center justify-between">
                  <button onClick={handleBackOrClose} className="p-2 -ml-2 rounded-full hover:bg-gray-100 active:scale-95 transition-all" aria-label={receiptData ? "Back to itemized split" : "Close add expense"}>
                    <MSIcon name={receiptData ? "arrow_back" : "close"} className="text-gray-900 text-2xl" />
                  </button>
                  <h1 className="font-bold text-3xl sm:text-lg text-[#007A64]">Add Expense</h1>
                  <button onClick={() => handleSave()} disabled={createExpense.isPending || !canSave} className={clsx("font-bold text-sm px-4 py-2 rounded-lg transition-all active:scale-95", canSave ? "text-[#007A64] hover:bg-[#EAF5F2]" : "text-gray-400 cursor-not-allowed")}>SAVE</button>
                </div>
              </header>
              {error && <div className="mx-6 mt-4 p-3 bg-red-50 text-red-700 text-sm rounded-lg border border-red-200">{error}</div>}
              <ManualExpenseEntry
                users={expenseUsers}
                groups={groups}
                plans={plans}
                currentUserId={currentUserId}
                involvedUsers={involvedUsers}
                activeIds={activeIds}
                description={description}
                amount={amount}
                payerId={payerId}
                groupId={groupId ? parseInt(groupId) : null}
                planId={planId ? parseInt(planId) : null}
                splitPreview={roundedPreview}
                saveBlockReason={saveBlockReason}
                isProcessingReceipt={isProcessingReceipt}
                onDescriptionChange={setDescription}
                onAmountChange={setAmount}
                onPayerChange={setPayerId}
                onGroupChange={(id) => setGroupId(id ? String(id) : '')}
                onPlanChange={(id) => setPlanId(id ? String(id) : '')}
                onSelectFriends={() => setStep('friends')}
                onSelectSplit={() => setStep('split')}
                onFileUpload={handleFileUpload}
              />
              <div className="sm:hidden sticky bottom-0 bg-black backdrop-blur-md p-5 pb-[calc(env(safe-area-inset-bottom)+1.25rem)]">
                <button onClick={() => handleSave()} disabled={createExpense.isPending || !canSave} className={clsx("w-full min-h-16 rounded-2xl font-bold text-xl flex items-center justify-center gap-3 transition-all active:scale-[0.98]", canSave ? "bg-[#007A64] text-white shadow-lg" : "bg-gray-800 text-gray-500 cursor-not-allowed")}>
                  Save Expense
                </button>
              </div>
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
