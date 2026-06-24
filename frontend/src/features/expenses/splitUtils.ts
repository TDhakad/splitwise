import type { ExpenseParticipant, ExpenseParticipantBase } from '../../types/api';
import type { NumberById, SplitMethod, StringById } from '../../types/ui';

export const parseAmount = (value: string | number | null | undefined): number =>
  typeof value === 'number' ? value : parseFloat(value ?? '0') || 0;

export function calculateSplitPreview(
  splitMethod: SplitMethod,
  total: number,
  activeIds: number[],
  customValues: StringById,
): NumberById {
  if (splitMethod === 'equal') {
    const share = activeIds.length ? total / activeIds.length : 0;
    return activeIds.reduce<NumberById>((acc, id) => ({ ...acc, [id]: share }), {});
  }

  if (splitMethod === 'unequal') {
    return activeIds.reduce<NumberById>((acc, id) => ({ ...acc, [id]: parseAmount(customValues[id]) }), {});
  }

  if (splitMethod === 'shares') {
    const totalShares = activeIds.reduce((sum, id) => sum + parseAmount(customValues[id]), 0);
    if (totalShares === 0) return activeIds.reduce<NumberById>((acc, id) => ({ ...acc, [id]: 0 }), {});
    return activeIds.reduce<NumberById>((acc, id) => ({ ...acc, [id]: (parseAmount(customValues[id]) / totalShares) * total }), {});
  }

  return activeIds.reduce<NumberById>((acc, id) => ({ ...acc, [id]: (parseAmount(customValues[id]) / 100) * total }), {});
}

export function getSplitValidation(
  splitMethod: SplitMethod,
  total: number,
  activeIds: number[],
  runningSum: number,
  pctSum: number | null,
  customValues?: StringById,
): string {
  if (!total || total <= 0) return '';
  if (!activeIds.length) return 'Select at least one person.';
  if (splitMethod === 'unequal' && Math.abs(runningSum - total) > 0.01) {
    return `Amounts sum to $${runningSum.toFixed(2)}, need $${total.toFixed(2)}.`;
  }
  if (splitMethod === 'percentage' && pctSum !== null && Math.abs(pctSum - 100) > 0.1) {
    return `Percentages sum to ${pctSum.toFixed(1)}%, need 100%.`;
  }
  if (splitMethod === 'shares') {
    const totalShares = activeIds.reduce((sum, id) => sum + parseAmount(customValues?.[id] || '0'), 0);
    if (totalShares <= 0) return 'Enter at least one share.';
  }
  return '';
}

export function buildExpenseParticipants(
  activeIds: number[],
  payerId: number,
  total: number,
  preview: NumberById,
): ExpenseParticipantBase[] {
  const participants = activeIds.map(uid => ({
    user_id: uid,
    amount_paid: uid === payerId ? total : 0,
    amount_owed: preview[uid] ?? 0,
  }));

  if (!activeIds.includes(payerId)) {
    participants.push({ user_id: payerId, amount_paid: total, amount_owed: 0 });
  }

  return participants;
}

export function buildEqualSplits(participants: ExpenseParticipant[], amount: number): StringById {
  const count = participants.length || 1;
  const share = (amount / count).toFixed(2);
  return participants.reduce<StringById>((acc, participant) => {
    acc[participant.user_id] = share;
    return acc;
  }, {});
}
