import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { API_BASE_URL, ApiError, apiJson } from '../../lib/constants';
import type { Notification, NotificationList } from '../../types/api';

export const notificationsKeys = {
  all: ['notifications'] as const,
  list: () => ['notifications', 'list'] as const,
};

export function useNotifications(enabled = true) {
  return useQuery<NotificationList, ApiError>({
    queryKey: notificationsKeys.list(),
    queryFn: () => apiJson<NotificationList>('/notifications/'),
    enabled,
    staleTime: 15_000,
  });
}

export function useNotificationStream(enabled = true) {
  const queryClient = useQueryClient();

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (!enabled || !token) return;

    const source = new EventSource(`${API_BASE_URL}/notifications/stream?token=${encodeURIComponent(token)}`);
    source.addEventListener('notification', (event) => {
      const notification = JSON.parse((event as MessageEvent).data) as Notification;
      queryClient.setQueryData<NotificationList>(notificationsKeys.list(), (current) => {
        if (!current) return { notifications: [notification], unread_count: notification.read_at ? 0 : 1 };
        if (current.notifications.some(item => item.id === notification.id)) return current;
        return {
          notifications: [notification, ...current.notifications].slice(0, 100),
          unread_count: current.unread_count + (notification.read_at ? 0 : 1),
        };
      });
    });

    return () => source.close();
  }, [enabled, queryClient]);
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();

  return useMutation<Notification, ApiError, number>({
    mutationFn: (notificationId) => apiJson<Notification>(`/notifications/${notificationId}/read`, { method: 'POST' }),
    onSuccess: (notification) => {
      queryClient.setQueryData<NotificationList>(notificationsKeys.list(), (current) => {
        if (!current) return current;
        return {
          notifications: current.notifications.map(item => item.id === notification.id ? notification : item),
          unread_count: current.notifications.some(item => item.id === notification.id && !item.read_at)
            ? Math.max(0, current.unread_count - 1)
            : current.unread_count,
        };
      });
    },
  });
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();

  return useMutation<{ status: string }, ApiError>({
    mutationFn: () => apiJson<{ status: string }>('/notifications/read-all', { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationsKeys.list() });
    },
  });
}
