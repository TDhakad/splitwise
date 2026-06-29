import { useMemo, useState } from 'react';
import { buildReceiptBreakdown, buildReceiptParticipants, calculateMemberTotals, toNumber } from './itemizedSplitUtils';
import type { ReceiptBreakdown, User } from '../../types/api';
import type { BooleanById, NumberById, ReceiptReviewData } from '../../types/ui';

export default function useItemizedSplit(
  receiptData: ReceiptReviewData,
  users: User[],
  involvedUsers: BooleanById,
  currentUserId: number,
  payerId: number,
  initialBreakdown?: ReceiptBreakdown | null,
) {
  const activeUsers = useMemo(() => users.filter(u => involvedUsers[u.id]), [users, involvedUsers]);
  const receiptTotal = toNumber(receiptData.total);
  const [itemAssignments, setItemAssignments] = useState<number[][]>(() => (
    initialBreakdown
      ? initialBreakdown.items.map(item => item.shares.map(share => share.user_id))
      : receiptData.items.map(() => activeUsers.map(u => u.id))
  ));
  const [customSplits, setCustomSplits] = useState<Array<NumberById | null>>(() => (
    initialBreakdown
      ? initialBreakdown.items.map(item => (
        item.split_type === 'custom'
          ? Object.fromEntries(item.shares.map(share => [share.user_id, share.amount])) as NumberById
          : null
      ))
      : receiptData.items.map(() => null)
  ));
  const [editingItemIdx, setEditingItemIdx] = useState<number | null>(null);

  const memberTotals = useMemo(
    () => calculateMemberTotals(receiptData, activeUsers, itemAssignments, customSplits),
    [activeUsers, customSplits, itemAssignments, receiptData],
  );
  const assignedSum = Object.values(memberTotals).reduce((sum, total) => sum + total.total, 0);
  const unassigned = receiptTotal - assignedSum;
  const isFullyAssigned = itemAssignments.every(assignment => assignment.length > 0);
  const missingItemNames = receiptData.items
    .map((item, idx) => itemAssignments[idx]?.length ? null : item.name || `Item ${idx + 1}`)
    .filter((name): name is string => Boolean(name));
  const itemizedError = missingItemNames.length > 0
    ? `${missingItemNames.length} item${missingItemNames.length === 1 ? '' : 's'} need assignment: ${missingItemNames.slice(0, 3).join(', ')}${missingItemNames.length > 3 ? ', ...' : ''}.`
    : Math.abs(unassigned) > 0.01
      ? `Assigned total is ${unassigned > 0 ? `$${unassigned.toFixed(2)} short` : `$${Math.abs(unassigned).toFixed(2)} over`}. Check item prices, tax, tip, discount, or receipt total.`
      : '';
  const canFinish = !itemizedError;

  const toggleUserForItem = (itemIndex: number, userId: number) => {
    setItemAssignments(prev => {
      const next = [...prev];
      const current = next[itemIndex];
      next[itemIndex] = current.includes(userId) ? current.filter(id => id !== userId) : [...current, userId];
      return next;
    });

    if (customSplits[itemIndex]) {
      setCustomSplits(prev => {
        const next = [...prev];
        next[itemIndex] = null;
        return next;
      });
    }
  };

  const setAllForMe = () => {
    setItemAssignments(receiptData.items.map(() => [currentUserId]));
    setCustomSplits(receiptData.items.map(() => null));
  };

  const saveCustomSplit = (idx: number, newSplit: NumberById) => {
    setCustomSplits(prev => {
      const next = [...prev];
      next[idx] = newSplit;
      return next;
    });
    setItemAssignments(prev => {
      const next = [...prev];
      next[idx] = Object.keys(newSplit).map(Number).filter(uid => newSplit[uid] > 0);
      return next;
    });
    setEditingItemIdx(null);
  };

  const clearCustomSplit = (idx: number) => {
    setCustomSplits(prev => {
      const next = [...prev];
      next[idx] = null;
      return next;
    });
  };

  const buildParticipants = () => buildReceiptParticipants(activeUsers, payerId, receiptTotal, memberTotals);
  const buildBreakdown = () => buildReceiptBreakdown(receiptData, activeUsers, itemAssignments, customSplits, memberTotals);

  return {
    activeUsers,
    assignedSum,
    buildBreakdown,
    buildParticipants,
    clearCustomSplit,
    customSplits,
    editingItemIdx,
    canFinish,
    itemizedError,
    isFullyAssigned,
    itemAssignments,
    memberTotals,
    receiptTotal,
    saveCustomSplit,
    setAllForMe,
    setEditingItemIdx,
    toggleUserForItem,
    unassigned,
  };
}
