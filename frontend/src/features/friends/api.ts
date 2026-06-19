import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiError, apiJson } from '../../lib/constants';
import { usersKeys } from '../users/api';
import type { Friendship, FriendshipWithUsers } from '../../types/api';

interface RespondFriendRequestVariables {
  id: number;
  status: 'ACCEPTED' | 'REJECTED' | 'REMOVED';
}

export const friendsKeys = {
  all: ['friends'] as const,
  requests: () => ['friends', 'requests'] as const,
};

export function useFriendRequests() {
  return useQuery<FriendshipWithUsers[], ApiError>({
    queryKey: friendsKeys.requests(),
    queryFn: () => apiJson<FriendshipWithUsers[]>('/friends/requests'),
    staleTime: 15_000,
  });
}

export function useSendFriendRequest() {
  const queryClient = useQueryClient();

  return useMutation<Friendship, ApiError, string>({
    mutationFn: (email) => apiJson<Friendship>('/friends/request', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: friendsKeys.requests() });
    },
  });
}

export function useRespondFriendRequest() {
  const queryClient = useQueryClient();

  return useMutation<Friendship, ApiError, RespondFriendRequestVariables>({
    mutationFn: ({ id, status }) => apiJson<Friendship>(`/friends/request/${id}?status=${status}`, { method: 'PUT' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: friendsKeys.requests() });
      queryClient.invalidateQueries({ queryKey: usersKeys.list() });
    },
  });
}
