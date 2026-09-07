import axios from 'axios';

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use(config => {
  const match = document.cookie.match(new RegExp('(^| )gx_csrf=([^;]+)'));
  if (match) {
    config.headers['x-csrf-token'] = match[2];
  }
  return config;
});
