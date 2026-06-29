import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiError, apiJson } from '../../lib/constants';
import { balancesKeys } from '../balances/api';
import { groupsKeys } from '../groups/api';
import type { Settlement, SettlementCreate } from '../../types/api';

export const settlementsKeys = {
  all: ['settlements'] as const,
  user: (userId: number | undefined, filters?: SettlementFilters) => ['settlements', 'user', userId, filters ?? {}] as const,
};

export interface SettlementFilters {
  start_date?: string;
  end_date?: string;
  group_id?: number;
}

function toQueryString(params: object) {
  const search = new URLSearchParams();
  Object.entries(params as Record<string, string | number | boolean | undefined>).forEach(([key, value]) => {
    if (value !== undefined && value !== '') search.set(key, String(value));
  });
  const query = search.toString();
  return query ? `?${query}` : '';
}

export function useUserSettlements(userId: number | undefined, filters: SettlementFilters = {}) {
  return useQuery<Settlement[], ApiError>({
    queryKey: settlementsKeys.user(userId, filters),
    queryFn: () => apiJson<Settlement[]>(`/users/${userId}/settlements${toQueryString(filters)}`),
    enabled: Boolean(userId),
    staleTime: 15_000,
  });
}

interface CreateSettlementVariables {
  currentUserId: number;
  payload: SettlementCreate;
}

export function useCreateSettlement() {
  const queryClient = useQueryClient();

  return useMutation<Settlement, ApiError, CreateSettlementVariables>({
    mutationFn: ({ currentUserId, payload }) => apiJson<Settlement>(`/settlements/?current_user_id=${currentUserId}`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
    onSuccess: (_, { currentUserId, payload }) => {
      queryClient.invalidateQueries({ queryKey: settlementsKeys.user(currentUserId) });
      queryClient.invalidateQueries({ queryKey: balancesKeys.raw(currentUserId) });
      queryClient.invalidateQueries({ queryKey: balancesKeys.summary(currentUserId) });
      if (payload.group_id) {
        queryClient.invalidateQueries({ queryKey: groupsKeys.settlements(payload.group_id) });
        queryClient.invalidateQueries({ queryKey: groupsKeys.balances(payload.group_id) });
      }
    },
  });
}

interface UpdateSettlementVariables {
  settlementId: number;
  payload: { amount: number };
  groupId?: number | null;
  currentUserId: number;
}

export function useUpdateSettlement() {
  const queryClient = useQueryClient();

  return useMutation<Settlement, ApiError, UpdateSettlementVariables>({
    mutationFn: ({ settlementId, payload }) => apiJson<Settlement>(`/settlements/${settlementId}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),
    onSuccess: (_, { currentUserId, groupId }) => {
      queryClient.invalidateQueries({ queryKey: settlementsKeys.user(currentUserId) });
      queryClient.invalidateQueries({ queryKey: balancesKeys.raw(currentUserId) });
      queryClient.invalidateQueries({ queryKey: balancesKeys.summary(currentUserId) });
      if (groupId) {
        queryClient.invalidateQueries({ queryKey: groupsKeys.settlements(groupId) });
        queryClient.invalidateQueries({ queryKey: groupsKeys.balances(groupId) });
      }
    },
  });
}

interface DeleteSettlementVariables {
  settlementId: number;
  groupId?: number | null;
  currentUserId: number;
}

export function useDeleteSettlement() {
  const queryClient = useQueryClient();

  return useMutation<void, ApiError, DeleteSettlementVariables>({
    mutationFn: ({ settlementId }) => apiJson<void>(`/settlements/${settlementId}`, {
      method: 'DELETE',
    }),
    onSuccess: (_, { currentUserId, groupId }) => {
      queryClient.invalidateQueries({ queryKey: settlementsKeys.user(currentUserId) });
      queryClient.invalidateQueries({ queryKey: balancesKeys.raw(currentUserId) });
      queryClient.invalidateQueries({ queryKey: balancesKeys.summary(currentUserId) });
      if (groupId) {
        queryClient.invalidateQueries({ queryKey: groupsKeys.settlements(groupId) });
        queryClient.invalidateQueries({ queryKey: groupsKeys.balances(groupId) });
      }
    },
  });
}
