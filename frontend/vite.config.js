import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

// Cau hinh Vite, alias duong dan @ va proxy chuyen tiep API sang Express backend
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
      '/media': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
});
