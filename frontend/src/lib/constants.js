export const API_BASE_URL = import.meta.env.PROD ? '' : 'http://127.0.0.1:8000';
export const GOOGLE_CLIENT_ID = '748854217231-ahlkddj555mqvk1a9c9qviqa5hbddjb4.apps.googleusercontent.com';

export const apiFetch = async (endpoint, options = {}) => {
  const token = localStorage.getItem('access_token');
  const headers = { ...options.headers };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (!headers['Content-Type'] && !(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }
  return fetch(`${API_BASE_URL}${endpoint}`, { ...options, headers });
};
