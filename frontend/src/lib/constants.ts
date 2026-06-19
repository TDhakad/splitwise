export const API_BASE_URL = import.meta.env.PROD ? '' : 'http://127.0.0.1:8000';
export const GOOGLE_CLIENT_ID = '748854217231-ahlkddj555mqvk1a9c9qviqa5hbddjb4.apps.googleusercontent.com';

export const apiFetch = async (endpoint: string, options: RequestInit = {}): Promise<Response> => {
  const token = localStorage.getItem('access_token');
  const headers = new Headers(options.headers);
  if (token) headers.set('Authorization', `Bearer ${token}`);
  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }
  return fetch(`${API_BASE_URL}${endpoint}`, { ...options, headers });
};

export class ApiError extends Error {
  status: number;
  data: unknown;

  constructor(message: string, status: number, data: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

const getApiErrorMessage = (data: unknown): string => {
  if (typeof data === 'object' && data !== null && 'detail' in data) {
    const detail = (data as { detail?: unknown }).detail;
    if (typeof detail === 'string') return detail;
  }
  return 'Request failed';
};

export const apiJson = async <T>(endpoint: string, options: RequestInit = {}): Promise<T> => {
  const response = await apiFetch(endpoint, options);
  if (response.status === 204) return null as T;

  const contentType = response.headers.get('content-type') || '';
  const data: unknown = contentType.includes('application/json') ? await response.json() : await response.text();

  if (!response.ok) {
    throw new ApiError(getApiErrorMessage(data), response.status, data);
  }

  return data as T;
};

export const getErrorMessage = (error: unknown, fallback = 'Request failed'): string =>
  error instanceof Error ? error.message : fallback;
