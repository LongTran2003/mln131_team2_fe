import axios from 'axios';
import { API_BASE } from '../config';

export const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
});

// Centralized error log
api.interceptors.response.use(
  (res) => res,
  (err) => {
    const msg = err.response?.data?.error || err.message;
    console.error('[API Error]', msg);
    return Promise.reject(new Error(msg));
  }
);