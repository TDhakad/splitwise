import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiError, apiJson } from '../../lib/constants';
import { balancesKeys } from '../balances/api';
import type { BalanceSummary, ExpenseWithCreator, GroupCreate, GroupDetail, GroupMemberCreate, Settlement } from '../../types/api';

interface StatusResponse {
  status: string;
  simplify_debts?: boolean;
}

export const groupsKeys = {
  all: ['groups'] as const,
  list: (filters?: GroupFilters) => ['groups', 'list', filters ?? {}] as const,
  detail: (groupId: number | null | undefined) => ['groups', 'detail', groupId] as const,
  expenses: (groupId: number | null | undefined, filters?: TransactionFilters) => ['groups', 'expenses', groupId, filters ?? {}] as const,
  settlements: (groupId: number | null | undefined, filters?: DateFilters) => ['groups', 'settlements', groupId, filters ?? {}] as const,
  balances: (groupId: number | null | undefined) => ['groups', 'balances', groupId] as const,
};

export interface GroupFilters {
  search?: string;
}

export interface DateFilters {
  start_date?: string;
  end_date?: string;
}

export interface TransactionFilters extends DateFilters {
  category?: string;
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

export function useGroups(enabled = true, filters: GroupFilters = {}) {
  return useQuery<GroupDetail[], ApiError>({
    queryKey: groupsKeys.list(filters),
    queryFn: () => apiJson<GroupDetail[]>(`/groups/${toQueryString(filters)}`),
    enabled,
    staleTime: 60_000,
  });
}

export function useGroup(groupId: number | null | undefined) {
  return useQuery<GroupDetail, ApiError>({
    queryKey: groupsKeys.detail(groupId),
    queryFn: () => apiJson<GroupDetail>(`/groups/${groupId}`),
    enabled: Boolean(groupId),
  });
}

export function useGroupExpenses(groupId: number | null | undefined, filters: TransactionFilters = {}) {
  return useQuery<ExpenseWithCreator[], ApiError>({
    queryKey: groupsKeys.expenses(groupId, filters),
    queryFn: () => apiJson<ExpenseWithCreator[]>(`/groups/${groupId}/expenses${toQueryString(filters)}`),
    enabled: Boolean(groupId),
  });
}

export function useGroupSettlements(groupId: number | null | undefined, filters: DateFilters = {}) {
  return useQuery<Settlement[], ApiError>({
    queryKey: groupsKeys.settlements(groupId, filters),
    queryFn: () => apiJson<Settlement[]>(`/groups/${groupId}/settlements${toQueryString(filters)}`),
    enabled: Boolean(groupId),
  });
}

export function useGroupBalances(groupId: number | null | undefined) {
  return useQuery<BalanceSummary[], ApiError>({
    queryKey: groupsKeys.balances(groupId),
    queryFn: () => apiJson<BalanceSummary[]>(`/groups/${groupId}/balances`),
    enabled: Boolean(groupId),
    staleTime: 15_000,
  });
}

interface CreateGroupVariables {
  currentUserId: number;
  payload: GroupCreate;
  memberIds: number[];
  memberEmails?: string[];
}

export function useCreateGroup() {
  const queryClient = useQueryClient();

  return useMutation<GroupDetail, ApiError, CreateGroupVariables>({
    mutationFn: async ({ payload, memberIds, memberEmails }) => {
      const group = await apiJson<GroupDetail>('/groups/', {
        method: 'POST',
        body: JSON.stringify({ ...payload, member_ids: memberIds, member_emails: memberEmails ?? [] }),
      });
      return group;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: groupsKeys.list() });
    },
  });
}

export function useUpdateGroupSimplify(groupId: number | null | undefined, currentUserId: number | undefined) {
  const queryClient = useQueryClient();

  return useMutation<StatusResponse, ApiError, boolean>({
    mutationFn: (enable) => apiJson<StatusResponse>(`/groups/${groupId}/simplify?enable=${enable}`, { method: 'PUT' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: groupsKeys.detail(groupId) });
      queryClient.invalidateQueries({ queryKey: groupsKeys.balances(groupId) });
      queryClient.invalidateQueries({ queryKey: groupsKeys.list() });
      queryClient.invalidateQueries({ queryKey: balancesKeys.raw(currentUserId) });
      queryClient.invalidateQueries({ queryKey: balancesKeys.summary(currentUserId) });
    },
  });
}

export function useAddGroupMember(groupId: number | null | undefined) {
  const queryClient = useQueryClient();

  return useMutation<StatusResponse, ApiError, GroupMemberCreate>({
    mutationFn: (member) => apiJson<StatusResponse>(`/groups/${groupId}/members`, {
      method: 'POST',
      body: JSON.stringify(member),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: groupsKeys.detail(groupId) });
      queryClient.invalidateQueries({ queryKey: groupsKeys.list() });
    },
  });
}

export function useRemoveGroupMember(groupId: number) {
  const queryClient = useQueryClient();
  
  return useMutation<StatusResponse, ApiError, number>({
    mutationFn: (userId) => apiJson<StatusResponse>(`/groups/${groupId}/members/${userId}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: groupsKeys.detail(groupId) });
      queryClient.invalidateQueries({ queryKey: groupsKeys.list() });
    },
  });
}
