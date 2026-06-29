import { useQuery } from '@tanstack/react-query';
import { ApiError, apiJson } from '../../lib/constants';
import type { SpendingAnalytics } from '../../types/api';

export const analyticsKeys = {
  all: ['analytics'] as const,
  spending: () => ['analytics', 'spending'] as const,
};

export function useSpendingAnalytics(enabled = true) {
  return useQuery<SpendingAnalytics, ApiError>({
    queryKey: analyticsKeys.spending(),
    queryFn: () => apiJson<SpendingAnalytics>('/analytics/spending'),
    enabled,
    staleTime: 60_000,
  });
}
