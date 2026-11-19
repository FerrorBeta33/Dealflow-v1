import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './lib/auth';
import { App } from './app';
import './styles.css';
const client = new QueryClient({
  defaultOptions: { queries: { retry: false, staleTime: 15000, refetchOnWindowFocus: false } },
});
const root = document.getElementById('root');
if (!root) throw new Error('Root element is missing');
ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <QueryClientProvider client={client}>
      <BrowserRouter>
        <AuthProvider>
          <App />
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>,
);
