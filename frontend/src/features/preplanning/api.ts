import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiError, apiJson } from '../../lib/constants';
import type {
  Plan,
  PlanAllocation,
  PlanAllocationCreate,
  PlanCreate,
  PlanDetail,
  PlanPredecision,
  PlanPredecisionCreate,
  Group,
} from '../../types/api';

export const plansKeys = {
  all: ['preplanning'] as const,
  list: () => ['preplanning', 'plans'] as const,
  detail: (planId: number | null | undefined) => ['preplanning', 'plans', planId] as const,
};

export function usePlans(enabled = true) {
  return useQuery<Plan[], ApiError>({
    queryKey: plansKeys.list(),
    queryFn: () => apiJson<Plan[]>('/api/v1/preplanning/plans'),
    enabled,
    staleTime: 30_000,
  });
}

export function usePlan(planId: number | null | undefined) {
  return useQuery<PlanDetail, ApiError>({
    queryKey: plansKeys.detail(planId),
    queryFn: () => apiJson<PlanDetail>(`/api/v1/preplanning/plans/${planId}`),
    enabled: Boolean(planId),
    staleTime: 15_000,
  });
}

export function useCreatePlan() {
  const queryClient = useQueryClient();

  return useMutation<Plan, ApiError, PlanCreate>({
    mutationFn: (payload) => apiJson<Plan>('/api/v1/preplanning/plans', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: plansKeys.list() });
    },
  });
}

export function useCreatePredecision(planId: number | null | undefined) {
  const queryClient = useQueryClient();

  return useMutation<PlanPredecision, ApiError, PlanPredecisionCreate>({
    mutationFn: (payload) => apiJson<PlanPredecision>(`/api/v1/preplanning/plans/${planId}/predecisions`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: plansKeys.detail(planId) });
      queryClient.invalidateQueries({ queryKey: plansKeys.list() });
    },
  });
}

export function useUpdateAllocations(planId: number | null | undefined) {
  const queryClient = useQueryClient();

  return useMutation<PlanAllocation[], ApiError, PlanAllocationCreate[]>({
    mutationFn: (allocations) => apiJson<PlanAllocation[]>(`/api/v1/preplanning/plans/${planId}/allocations`, {
      method: 'PUT',
      body: JSON.stringify(allocations),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: plansKeys.detail(planId) });
      queryClient.invalidateQueries({ queryKey: plansKeys.list() });
    },
  });
}

export function useUpdatePlanGroups(planId: number | null | undefined) {
  const queryClient = useQueryClient();

  return useMutation<Group[], ApiError, number[]>({
    mutationFn: (groupIds) => apiJson<Group[]>(`/api/v1/preplanning/plans/${planId}/groups`, {
      method: 'PUT',
      body: JSON.stringify(groupIds),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: plansKeys.detail(planId) });
      queryClient.invalidateQueries({ queryKey: plansKeys.list() });
    },
  });
}
