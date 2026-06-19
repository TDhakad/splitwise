import { useQuery } from '@tanstack/react-query';
import { ApiError, apiJson } from '../../lib/constants';
import type { BalanceSummary, TotalsBalanceSummary } from '../../types/api';

export const balancesKeys = {
  all: ['balances'] as const,
  summary: (userId: number | undefined) => ['balances', 'summary', userId] as const,
  raw: (userId: number | undefined) => ['balances', 'raw', userId] as const,
};

export function useBalanceSummary(userId: number | undefined) {
  return useQuery<TotalsBalanceSummary, ApiError>({
    queryKey: balancesKeys.summary(userId),
    queryFn: () => apiJson<TotalsBalanceSummary>(`/balances/summary/${userId}`),
    enabled: Boolean(userId),
    staleTime: 15_000,
  });
}

export function useRawBalances(userId: number | undefined) {
  return useQuery<BalanceSummary[], ApiError>({
    queryKey: balancesKeys.raw(userId),
    queryFn: () => apiJson<BalanceSummary[]>(`/balances/${userId}`),
    enabled: Boolean(userId),
    staleTime: 15_000,
  });
}
