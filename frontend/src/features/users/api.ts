import { useQuery } from '@tanstack/react-query';
import { ApiError, apiJson } from '../../lib/constants';
import type { User } from '../../types/api';

export const usersKeys = {
  all: ['users'] as const,
  list: () => ['users', 'list'] as const,
};

export function useUsers(enabled = true) {
  return useQuery<User[], ApiError>({
    queryKey: usersKeys.list(),
    queryFn: () => apiJson<User[]>('/users/'),
    enabled,
    staleTime: 60_000,
  });
}
