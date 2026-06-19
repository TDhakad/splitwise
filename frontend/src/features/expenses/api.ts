import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiError, apiJson } from '../../lib/constants';
import { balancesKeys } from '../balances/api';
import { groupsKeys } from '../groups/api';
import { plansKeys } from '../preplanning/api';
import type { AuditLog, Expense, ExpenseCreate, ExpenseWithCreator } from '../../types/api';

export const expensesKeys = {
  all: ['expenses'] as const,
  user: (userId: number | undefined) => ['expenses', 'user', userId] as const,
  audit: (expenseId: number | undefined) => ['expenses', 'audit', expenseId] as const,
};

export function useUserExpenses(userId: number | undefined) {
  return useQuery<ExpenseWithCreator[], ApiError>({
    queryKey: expensesKeys.user(userId),
    queryFn: () => apiJson<ExpenseWithCreator[]>(`/users/${userId}/expenses`),
    enabled: Boolean(userId),
    staleTime: 15_000,
  });
}

export function useExpenseAudit(expenseId: number | undefined) {
  return useQuery<AuditLog[], ApiError>({
    queryKey: expensesKeys.audit(expenseId),
    queryFn: () => apiJson<AuditLog[]>(`/expenses/${expenseId}/audit`),
    enabled: Boolean(expenseId),
    staleTime: 60_000,
  });
}

interface ExpenseWriteVariables {
  currentUserId: number;
  payload: ExpenseCreate;
}

export function useCreateExpense() {
  const queryClient = useQueryClient();

  return useMutation<Expense, ApiError, ExpenseWriteVariables>({
    mutationFn: ({ currentUserId, payload }) => apiJson<Expense>(`/expenses/?created_by=${currentUserId}`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
    onSuccess: (_, { currentUserId, payload }) => {
      queryClient.invalidateQueries({ queryKey: expensesKeys.user(currentUserId) });
      queryClient.invalidateQueries({ queryKey: balancesKeys.raw(currentUserId) });
      queryClient.invalidateQueries({ queryKey: balancesKeys.summary(currentUserId) });
      if (payload.group_id) {
        queryClient.invalidateQueries({ queryKey: groupsKeys.expenses(payload.group_id) });
        queryClient.invalidateQueries({ queryKey: groupsKeys.balances(payload.group_id) });
      }
      if (payload.plan_id) {
        queryClient.invalidateQueries({ queryKey: plansKeys.list() });
        queryClient.invalidateQueries({ queryKey: plansKeys.detail(payload.plan_id) });
      }
    },
  });
}

interface UpdateExpenseVariables extends ExpenseWriteVariables {
  expenseId: number;
}

export function useUpdateExpense() {
  const queryClient = useQueryClient();

  return useMutation<Expense, ApiError, UpdateExpenseVariables>({
    mutationFn: ({ expenseId, payload }) => apiJson<Expense>(`/expenses/${expenseId}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),
    onSuccess: (_, { expenseId, currentUserId, payload }) => {
      queryClient.invalidateQueries({ queryKey: expensesKeys.user(currentUserId) });
      queryClient.invalidateQueries({ queryKey: expensesKeys.audit(expenseId) });
      queryClient.invalidateQueries({ queryKey: balancesKeys.raw(currentUserId) });
      queryClient.invalidateQueries({ queryKey: balancesKeys.summary(currentUserId) });
      if (payload.group_id) {
        queryClient.invalidateQueries({ queryKey: groupsKeys.expenses(payload.group_id) });
        queryClient.invalidateQueries({ queryKey: groupsKeys.balances(payload.group_id) });
      }
      if (payload.plan_id) {
        queryClient.invalidateQueries({ queryKey: plansKeys.list() });
        queryClient.invalidateQueries({ queryKey: plansKeys.detail(payload.plan_id) });
      }
    },
  });
}
