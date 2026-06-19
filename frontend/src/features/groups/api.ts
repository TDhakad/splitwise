import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiError, apiJson } from '../../lib/constants';
import { balancesKeys } from '../balances/api';
import type { BalanceSummary, ExpenseWithCreator, Group, GroupCreate, GroupDetail, Settlement } from '../../types/api';

interface StatusResponse {
  status: string;
  simplify_debts?: boolean;
}

export const groupsKeys = {
  all: ['groups'] as const,
  list: () => ['groups', 'list'] as const,
  detail: (groupId: number | null | undefined) => ['groups', 'detail', groupId] as const,
  expenses: (groupId: number | null | undefined) => ['groups', 'expenses', groupId] as const,
  settlements: (groupId: number | null | undefined) => ['groups', 'settlements', groupId] as const,
  balances: (groupId: number | null | undefined) => ['groups', 'balances', groupId] as const,
};

export function useGroups(enabled = true) {
  return useQuery<GroupDetail[], ApiError>({
    queryKey: groupsKeys.list(),
    queryFn: () => apiJson<GroupDetail[]>('/groups/'),
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

export function useGroupExpenses(groupId: number | null | undefined) {
  return useQuery<ExpenseWithCreator[], ApiError>({
    queryKey: groupsKeys.expenses(groupId),
    queryFn: () => apiJson<ExpenseWithCreator[]>(`/groups/${groupId}/expenses`),
    enabled: Boolean(groupId),
  });
}

export function useGroupSettlements(groupId: number | null | undefined) {
  return useQuery<Settlement[], ApiError>({
    queryKey: groupsKeys.settlements(groupId),
    queryFn: () => apiJson<Settlement[]>(`/groups/${groupId}/settlements`),
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
}

export function useCreateGroup() {
  const queryClient = useQueryClient();

  return useMutation<Group, ApiError, CreateGroupVariables>({
    mutationFn: async ({ currentUserId, payload, memberIds }) => {
      const group = await apiJson<Group>(`/groups/?created_by=${currentUserId}`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      await Promise.all(memberIds.map(userId => apiJson<StatusResponse>(`/groups/${group.id}/members/${userId}`, { method: 'POST' })));
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

  return useMutation<StatusResponse, ApiError, number>({
    mutationFn: (userId) => apiJson<StatusResponse>(`/groups/${groupId}/members/${userId}`, { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: groupsKeys.detail(groupId) });
      queryClient.invalidateQueries({ queryKey: groupsKeys.list() });
    },
  });
}
