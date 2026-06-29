import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiError, apiJson } from '../../lib/constants';
import { balancesKeys } from '../balances/api';
import { groupsKeys } from '../groups/api';
import { plansKeys } from '../preplanning/api';
import type { AuditLog, Expense, ExpenseCreate, ExpenseWithCreator } from '../../types/api';

export const expensesKeys = {
  all: ['expenses'] as const,
  user: (userId: number | undefined, filters?: ExpenseFilters) => ['expenses', 'user', userId, filters ?? {}] as const,
  audit: (expenseId: number | undefined) => ['expenses', 'audit', expenseId] as const,
};

export interface ExpenseFilters {
  start_date?: string;
  end_date?: string;
  category?: string;
  group_id?: number;
  plan_id?: number;
  search?: string;
  include_deleted?: boolean;
}

function toQueryString(params: object) {
  const search = new URLSearchParams();
  Object.entries(params as Record<string, string | number | boolean | undefined>).forEach(([key, value]) => {
    if (value !== undefined && value !== '') search.set(key, String(value));
  });
  const query = search.toString();
  return query ? `?${query}` : '';
}

export function useUserExpenses(userId: number | undefined, filters: ExpenseFilters = {}) {
  return useQuery<ExpenseWithCreator[], ApiError>({
    queryKey: expensesKeys.user(userId, filters),
    queryFn: () => apiJson<ExpenseWithCreator[]>(`/users/${userId}/expenses${toQueryString(filters)}`),
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

interface DeleteExpenseVariables {
  currentUserId: number;
  expense: ExpenseWithCreator;
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

export function useDeleteExpense() {
  const queryClient = useQueryClient();

  return useMutation<null, ApiError, DeleteExpenseVariables>({
    mutationFn: ({ expense }) => apiJson<null>(`/expenses/${expense.id}`, {
      method: 'DELETE',
    }),
    onSuccess: (_, { currentUserId, expense }) => {
      queryClient.invalidateQueries({ queryKey: expensesKeys.user(currentUserId) });
      queryClient.removeQueries({ queryKey: expensesKeys.audit(expense.id) });
      queryClient.invalidateQueries({ queryKey: balancesKeys.raw(currentUserId) });
      queryClient.invalidateQueries({ queryKey: balancesKeys.summary(currentUserId) });
      if (expense.group_id) {
        queryClient.invalidateQueries({ queryKey: groupsKeys.expenses(expense.group_id) });
        queryClient.invalidateQueries({ queryKey: groupsKeys.balances(expense.group_id) });
      }
      if (expense.plan_id) {
        queryClient.invalidateQueries({ queryKey: plansKeys.list() });
        queryClient.invalidateQueries({ queryKey: plansKeys.detail(expense.plan_id) });
      }
    },
  });
}
