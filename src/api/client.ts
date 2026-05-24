import axios from 'axios';
import { API_BASE } from '../config';

export const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (!err.response) {
      // Lỗi mạng — không log console để tránh spam khi mạng không ổn định
      return Promise.reject(new Error('Mất kết nối, đang thử lại...'));
    }
    const msg = err.response.data?.error
      || err.response.data?.message
      || `Lỗi máy chủ (${err.response.status})`;
    return Promise.reject(new Error(msg));
  }
);