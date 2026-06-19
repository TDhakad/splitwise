import { useMutation, useQuery } from '@tanstack/react-query';
import { ApiError, apiJson } from '../../lib/constants';
import type { Token, User } from '../../types/api';

interface LoginPayload {
  email: string;
  password: string;
}

interface RegisterPayload extends LoginPayload {
  name: string;
}

export const authKeys = {
  me: (token: string | null) => ['auth', 'me', token] as const,
};

export function useCurrentUser(token: string | null) {
  return useQuery<User, ApiError>({
    queryKey: authKeys.me(token),
    queryFn: () => apiJson<User>('/users/me'),
    enabled: Boolean(token),
    staleTime: 5 * 60_000,
  });
}

export function useLogin() {
  return useMutation<Token, ApiError, LoginPayload>({
    mutationFn: ({ email, password }) => {
      const formData = new URLSearchParams();
      formData.append('username', email);
      formData.append('password', password);

      return apiJson<Token>('/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: formData.toString(),
      });
    },
  });
}

export function useGoogleAuth() {
  return useMutation<Token, ApiError, string>({
    mutationFn: (credential) => apiJson<Token>('/auth/google', {
      method: 'POST',
      body: JSON.stringify({ token: credential }),
    }),
  });
}

export function useRegister() {
  return useMutation<User, ApiError, RegisterPayload>({
    mutationFn: ({ email, name, password }) => apiJson<User>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        email,
        name,
        password,
        auth_provider: 'local',
      }),
    }),
  });
}
