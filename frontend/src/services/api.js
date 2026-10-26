import axios from 'axios';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000',
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

export function getApiError(error) {
  return error.response?.data?.error?.message || 'We couldn’t reach Chatz. Check your connection and try again.';
}
