import { create } from 'zustand';
import client from '../api/client';
import type { User } from '../types';

interface AuthState {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  loadUser: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: localStorage.getItem('token'),
  loading: false,

  login: async (username, password) => {
    const res = await client.post('/auth/login', { username, password });
    const token = res.data.access_token;
    localStorage.setItem('token', token);
    client.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    set({ token });
    await get().loadUser();
  },

  register: async (username, email, password) => {
    const res = await client.post('/auth/register', { username, email, password });
    const token = res.data.access_token;
    localStorage.setItem('token', token);
    client.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    set({ token });
    await get().loadUser();
  },

  logout: () => {
    localStorage.removeItem('token');
    delete client.defaults.headers.common['Authorization'];
    set({ user: null, token: null });
  },

  loadUser: async () => {
    const token = get().token;
    if (!token) return;
    set({ loading: true });
    try {
      client.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      const res = await client.get('/auth/me');
      set({ user: res.data, loading: false });
    } catch {
      localStorage.removeItem('token');
      delete client.defaults.headers.common['Authorization'];
      set({ user: null, token: null, loading: false });
    }
  },
}));
