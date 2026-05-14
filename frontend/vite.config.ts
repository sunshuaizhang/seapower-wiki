import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Dev proxy: requests to /api/* from the React dev server (5173) are forwarded
// to the Spring Boot backend (8080) so the browser sees a same-origin call.
// In production the two are deployed separately and the browser hits the
// backend directly — CORS is handled by CorsConfig.java on the backend.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:8080',
    },
  },
});
