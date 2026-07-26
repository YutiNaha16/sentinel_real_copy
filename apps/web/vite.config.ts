import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Dev server on 5180 (5173 is Vite's default; using 5180 avoids clashing with
// another Vite project running on 5173). Proxies /api to the NestJS backend on :3000.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5180,
    strictPort: true,
    proxy: {
      '/api': 'http://localhost:3000',
    },
  },
});
