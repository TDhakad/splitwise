import { useMemo, useState } from 'react';
import { buildReceiptParticipants, calculateMemberTotals, toNumber } from './itemizedSplitUtils';
import type { User } from '../../types/api';
import type { BooleanById, NumberById, ReceiptReviewData } from '../../types/ui';

export default function useItemizedSplit(receiptData: ReceiptReviewData, users: User[], involvedUsers: BooleanById, currentUserId: number, payerId: number) {
  const activeUsers = useMemo(() => users.filter(u => involvedUsers[u.id]), [users, involvedUsers]);
  const receiptTotal = toNumber(receiptData.total);
  const [itemAssignments, setItemAssignments] = useState<number[][]>(() => receiptData.items.map(() => activeUsers.map(u => u.id)));
  const [customSplits, setCustomSplits] = useState<Array<NumberById | null>>(() => receiptData.items.map(() => null));
  const [editingItemIdx, setEditingItemIdx] = useState<number | null>(null);

  const memberTotals = useMemo(
    () => calculateMemberTotals(receiptData, activeUsers, itemAssignments, customSplits),
    [activeUsers, customSplits, itemAssignments, receiptData],
  );
  const assignedSum = Object.values(memberTotals).reduce((sum, total) => sum + total.total, 0);
  const unassigned = receiptTotal - assignedSum;
  const isFullyAssigned = itemAssignments.every(assignment => assignment.length > 0);

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

  const buildParticipants = () => buildReceiptParticipants(activeUsers, payerId, receiptTotal, memberTotals);

  return {
    activeUsers,
    assignedSum,
    buildParticipants,
    customSplits,
    editingItemIdx,
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
