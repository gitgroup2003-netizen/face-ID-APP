import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

// The API (Express + SQLite) runs as a separate process on API_PORT and is
// proxied here so the frontend can call same-origin `/api/...` and
// `/uploads/...` paths in both dev and preview.
const API_PORT = process.env.API_PORT || 3001;

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      proxy: {
        '/api': `http://localhost:${API_PORT}`,
        '/uploads': `http://localhost:${API_PORT}`,
      },
    },
  };
});
