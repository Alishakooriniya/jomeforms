import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: '127.0.0.1',
    port: 5173,
    // Local API (backend/) so server mode needs no CORS setup in development
    proxy: { '/api': { target: 'http://127.0.0.1:4000', changeOrigin: false } },
  },
  build: {
    target: 'es2020',
    cssCodeSplit: true,
    sourcemap: false,
    reportCompressedSize: true,
  },
});
