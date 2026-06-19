import type { ExpenseParticipantBase, User } from '../../types/api';
import type { NumberById, ReceiptLineItem, ReceiptReviewData } from '../../types/ui';

export interface MemberTotal {
  subtotal: number;
  discount: number;
  tax: number;
  tip: number;
  total: number;
}

export interface SplitText {
  text: string;
  alert: boolean;
}

export const toNumber = (value: number | string | null | undefined): number =>
  typeof value === 'number' ? value : parseFloat(value ?? '0') || 0;

export function calculateMemberTotals(
  receiptData: ReceiptReviewData,
  activeUsers: User[],
  itemAssignments: number[][],
  customSplits: Array<NumberById | null>,
): Record<number, MemberTotal> {
  const totals: Record<number, MemberTotal> = {};
  activeUsers.forEach(u => totals[u.id] = { subtotal: 0, discount: 0, tax: 0, tip: 0, total: 0 });

  receiptData.items.forEach((item, idx) => {
    const assigned = itemAssignments[idx];
    const custom = customSplits[idx];

    if (custom) {
      Object.keys(custom).forEach(uid => {
        const userId = Number(uid);
        if (totals[userId]) totals[userId].subtotal += custom[userId] || 0;
      });
      return;
    }

    if (assigned.length === 0) return;
    const splitAmount = toNumber(item.price) / assigned.length;
    assigned.forEach(uid => {
      if (totals[uid]) totals[uid].subtotal += splitAmount;
    });
  });

  const totalSubtotal = Object.values(totals).reduce((sum, total) => sum + total.subtotal, 0);
  const discountTotal = toNumber(receiptData.discount);
  const taxTotal = toNumber(receiptData.tax);
  const tipTotal = toNumber(receiptData.tip);

  if (totalSubtotal > 0) {
    Object.keys(totals).forEach(uidKey => {
      const uid = Number(uidKey);
      const share = totals[uid].subtotal / totalSubtotal;
      totals[uid].discount = share * discountTotal;
      totals[uid].tax = share * taxTotal;
      totals[uid].tip = share * tipTotal;
      totals[uid].total = totals[uid].subtotal - totals[uid].discount + totals[uid].tax + totals[uid].tip;
    });
  }

  return totals;
}

export function getSplitText(
  item: ReceiptLineItem,
  assigned: number[],
  custom: NumberById | null,
  activeUsers: User[],
  currentUserId: number,
): SplitText {
  if (assigned.length === 0) return { text: 'Needs assignment', alert: true };

  if (custom) {
    const names = assigned.map(uid => activeUsers.find(u => u.id === uid)?.name.split(' ')[0] || 'Unknown');
    return { text: `Custom split between ${names.join(', ')}`, alert: false };
  }

  if (assigned.length === activeUsers.length) {
    return { text: `Split between All ($${(toNumber(item.price) / assigned.length).toFixed(2)} each)`, alert: false };
  }

  const names = assigned.map(uid => {
    if (uid === currentUserId) return 'You';
    return activeUsers.find(u => u.id === uid)?.name.split(' ')[0] || 'Unknown';
  });
  return { text: `Split between ${names.join(', ')} ($${(toNumber(item.price) / assigned.length).toFixed(2)} each)`, alert: false };
}

export function buildReceiptParticipants(
  activeUsers: User[],
  payerId: number,
  receiptTotal: number,
  memberTotals: Record<number, MemberTotal>,
): ExpenseParticipantBase[] {
  return activeUsers.map(u => ({
    user_id: u.id,
    amount_paid: u.id === payerId ? receiptTotal : 0,
    amount_owed: memberTotals[u.id].total,
  }));
}
