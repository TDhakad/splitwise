import { useQuery } from '@tanstack/react-query';
import { ApiError, apiJson } from '../../lib/constants';
import type { 
  CashflowAnalytics, 
  GroupAnalytics, 
  PredictionAnalytics, 
  ReceiptItemAnalytics, 
  ShoppingInsights, 
  SpendingAnalytics, 
  StandingAnalytics 
} from '../../types/api';

export const analyticsKeys = {
  all: ['analytics'] as const,
  spending: () => ['analytics', 'spending'] as const,
  standing: () => ['analytics', 'standing'] as const,
  receiptItems: () => ['analytics', 'receipt-items'] as const,
  groups: () => ['analytics', 'groups'] as const,
  predictions: () => ['analytics', 'predictions'] as const,
  shoppingInsights: () => ['analytics', 'shopping-insights'] as const,
  cashflow: () => ['analytics', 'cashflow'] as const,
};

export function useSpendingAnalytics(enabled = true) {
  return useQuery<SpendingAnalytics, ApiError>({
    queryKey: analyticsKeys.spending(),
    queryFn: () => apiJson<SpendingAnalytics>('/analytics/spending'),
    enabled,
    staleTime: 60_000,
  });
}

export function useStandingAnalytics(enabled = true) {
  return useQuery<StandingAnalytics, ApiError>({
    queryKey: analyticsKeys.standing(),
    queryFn: () => apiJson<StandingAnalytics>('/analytics/standing'),
    enabled,
    staleTime: 60_000,
  });
}

export function useReceiptItemAnalytics(enabled = true) {
  return useQuery<ReceiptItemAnalytics, ApiError>({
    queryKey: analyticsKeys.receiptItems(),
    queryFn: () => apiJson<ReceiptItemAnalytics>('/analytics/receipt-items'),
    enabled,
    staleTime: 60_000,
  });
}

export function useGroupAnalytics(enabled = true) {
  return useQuery<GroupAnalytics, ApiError>({
    queryKey: analyticsKeys.groups(),
    queryFn: () => apiJson<GroupAnalytics>('/analytics/groups'),
    enabled,
    staleTime: 60_000,
  });
}

export function usePredictionAnalytics(enabled = true) {
  return useQuery<PredictionAnalytics, ApiError>({
    queryKey: analyticsKeys.predictions(),
    queryFn: () => apiJson<PredictionAnalytics>('/analytics/predictions'),
    enabled,
    staleTime: 60_000,
  });
}

export function useShoppingInsights(enabled = true) {
  return useQuery<ShoppingInsights, ApiError>({
    queryKey: analyticsKeys.shoppingInsights(),
    queryFn: () => apiJson<ShoppingInsights>('/analytics/shopping-insights'),
    enabled,
    staleTime: 60_000,
  });
}

export function useCashflowAnalytics(enabled = true) {
  return useQuery<CashflowAnalytics, ApiError>({
    queryKey: analyticsKeys.cashflow(),
    queryFn: () => apiJson<CashflowAnalytics>('/analytics/cashflow'),
    enabled,
    staleTime: 60_000,
  });
}
