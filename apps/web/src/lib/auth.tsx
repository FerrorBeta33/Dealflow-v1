import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { api, save, sessionKey } from './api';
import type { Employee } from './types';
interface Auth {
  employee: Employee | null;
  loading: boolean;
  message: string;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}
const Context = createContext<Auth | null>(null);
export function AuthProvider({ children }: { children: ReactNode }) {
  const client = useQueryClient();
  const [state, setState] = useState<{
    employee: Employee | null;
    loading: boolean;
    message: string;
  }>({ employee: null, loading: true, message: '' });
  useEffect(() => {
    let active = true;
    const expired = () => {
      client.clear();
      setState({
        employee: null,
        loading: false,
        message: 'Your session expired. Please sign in again.',
      });
    };
    window.addEventListener('session-expired', expired);
    if (sessionStorage.getItem(sessionKey))
      api<Employee>('/auth/me')
        .then((employee) => {
          if (active) setState({ employee, loading: false, message: '' });
        })
        .catch((error: Error) => {
          if (active) setState({ employee: null, loading: false, message: error.message });
        });
    else
      Promise.resolve().then(() => {
        if (active) setState({ employee: null, loading: false, message: '' });
      });
    return () => {
      active = false;
      window.removeEventListener('session-expired', expired);
    };
  }, [client]);
  async function signIn(email: string, password: string) {
    const result = await save<{ employee: Employee; token: string }>('/auth/login', {
      email,
      password,
    });
    sessionStorage.setItem(sessionKey, result.token);
    client.clear();
    setState({ employee: result.employee, loading: false, message: '' });
  }
  async function signOut() {
    await save('/auth/logout');
    sessionStorage.removeItem(sessionKey);
    client.clear();
    setState({ employee: null, loading: false, message: 'Signed out successfully.' });
  }
  return <Context.Provider value={{ ...state, signIn, signOut }}>{children}</Context.Provider>;
}
export function useAuth() {
  const value = useContext(Context);
  if (!value) throw new Error('Missing authentication provider');
  return value;
}
