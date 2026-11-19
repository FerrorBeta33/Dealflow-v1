import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: '0.0.0.0',
    port: 4173,
    strictPort: true,
    allowedHosts: true,
    fs: {
      strict: true,
      allow: ['./', '../../shared', '../../node_modules'].map((path) =>
        fileURLToPath(new URL(path, import.meta.url)),
      ),
      deny: ['.env', '.env.*', '*.{crt,pem}', '**/.git/**', '**/.data/**', '**/.revolte/**'],
    },
    proxy: { '/api': 'http://127.0.0.1:4174' },
    headers: {
      'Content-Security-Policy': "frame-ancestors 'self' https://revolte.ai https://*.revolte.ai",
      'X-Content-Type-Options': 'nosniff',
    },
  },
  test: {
    environment: 'jsdom',
    include: ['apps/web/src/**/*.test.tsx'],
    setupFiles: ['./apps/web/src/test-setup.ts'],
    maxWorkers: 1,
  },
});
