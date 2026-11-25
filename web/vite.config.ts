import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // Proxy API calls to the Express server so the browser sees a single origin in dev.
    proxy: { '/api': 'http://localhost:4000' },
  },
});
