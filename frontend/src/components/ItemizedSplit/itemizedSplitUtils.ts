import type { ExpenseParticipantBase, ReceiptBreakdown, User } from '../../types/api';
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
  const totalCents = Math.round(receiptTotal * 100);
  const rawCents = activeUsers.map(user => ({ userId: user.id, cents: memberTotals[user.id].total * 100 }));
  const rounded = rawCents.map(({ userId, cents }) => ({ userId, cents: Math.floor(cents) }));
  let remaining = totalCents - rounded.reduce((sum, item) => sum + item.cents, 0);

  rawCents
    .map(({ userId, cents }) => ({ userId, fraction: cents - Math.floor(cents) }))
    .sort((a, b) => b.fraction - a.fraction)
    .forEach(({ userId }) => {
      if (remaining <= 0) return;
      const item = rounded.find(entry => entry.userId === userId);
      if (item) item.cents += 1;
      remaining -= 1;
    });

  const roundedById = rounded.reduce<Record<number, number>>((acc, item) => {
    acc[item.userId] = item.cents / 100;
    return acc;
  }, {});

  return activeUsers.map(u => ({
    user_id: u.id,
    amount_paid: u.id === payerId ? receiptTotal : 0,
    amount_owed: roundedById[u.id] ?? 0,
  }));
}

export function buildReceiptBreakdown(
  receiptData: ReceiptReviewData,
  activeUsers: User[],
  itemAssignments: number[][],
  customSplits: Array<NumberById | null>,
  memberTotals: Record<number, MemberTotal>,
): ReceiptBreakdown {
  return {
    distribution_method: 'proportional_by_item_subtotal',
    totals: {
      subtotal: toNumber(receiptData.subtotal),
      discount: toNumber(receiptData.discount),
      tax: toNumber(receiptData.tax),
      tip: toNumber(receiptData.tip),
      total: toNumber(receiptData.total),
    },
    items: receiptData.items.map((item, idx) => {
      const custom = customSplits[idx];
      const shares = custom
        ? Object.entries(custom)
          .filter(([, amount]) => amount > 0)
          .map(([userId, amount]) => ({
            user_id: Number(userId),
            amount,
          }))
        : itemAssignments[idx].map(userId => ({
          user_id: userId,
          amount: toNumber(item.price) / itemAssignments[idx].length,
        }));

      return {
        name: item.name,
        quantity: item.quantity ?? null,
        price: toNumber(item.price),
        split_type: custom ? 'custom' : shares.length === 1 ? 'individual' : 'shared',
        shares,
      };
    }),
    member_totals: activeUsers.map(user => ({
      user_id: user.id,
      subtotal: memberTotals[user.id].subtotal,
      discount: memberTotals[user.id].discount,
      tax: memberTotals[user.id].tax,
      tip: memberTotals[user.id].tip,
      total: memberTotals[user.id].total,
    })),
  };
}

export function inferShareWeights(amounts: NumberById): NumberById {
  const entries = Object.entries(amounts).filter(([, amount]) => amount > 0.005);
  if (entries.length === 0) return {};

  const minAmount = Math.min(...entries.map(([, amount]) => amount));
  return Object.fromEntries(entries.map(([userId, amount]) => {
    const share = Math.round((amount / minAmount) * 100) / 100;
    return [Number(userId), share];
  })) as NumberById;
}
