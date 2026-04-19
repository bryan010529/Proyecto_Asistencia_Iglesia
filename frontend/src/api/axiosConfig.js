import axios from 'axios';

let unauthorizedHandler = null;

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3001/api',
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const token = localStorage.getItem('token');
      localStorage.removeItem('token');
      localStorage.removeItem('user');

      if (token && typeof unauthorizedHandler === 'function') {
        unauthorizedHandler();
      }
    }

    return Promise.reject(error);
  }
);

export function setUnauthorizedHandler(handler) {
  unauthorizedHandler = handler;
}

export default api;
