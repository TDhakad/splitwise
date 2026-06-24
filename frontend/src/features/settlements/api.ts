import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiError, apiJson } from '../../lib/constants';
import { balancesKeys } from '../balances/api';
import { groupsKeys } from '../groups/api';
import type { Settlement, SettlementCreate } from '../../types/api';

export const settlementsKeys = {
  all: ['settlements'] as const,
  user: (userId: number | undefined) => ['settlements', 'user', userId] as const,
};

export function useUserSettlements(userId: number | undefined) {
  return useQuery<Settlement[], ApiError>({
    queryKey: settlementsKeys.user(userId),
    queryFn: () => apiJson<Settlement[]>(`/users/${userId}/settlements`),
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
