import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '..', 'VITE_');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
        allowedHosts: [env.VITE_ALLOWED_HOST || 'localhost'],
        proxy: {
          '/api': {
            target: env.VITE_API_URL?.replace('/api', '') || 'http://localhost:3002',
            changeOrigin: true,
          },
        },
      },
      plugins: [react()],
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
