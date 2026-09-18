import axios, { AxiosError } from 'axios';
import type { AxiosResponse } from 'axios';
import { getBackendUrl } from '../utils/api';

const api = axios.create({
  baseURL: `${getBackendUrl()}/api`,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error: AxiosError) => Promise.reject(error)
);

export default api;
