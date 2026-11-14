import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  root: here,
  plugins: [react()],
  resolve: { alias: { '@shared': path.resolve(here, '../shared') } },
  build: { outDir: path.resolve(here, 'dist'), emptyOutDir: true },
  server: {
    port: 5173,
    host: true,
    fs: { allow: ['..'] }, // lets the client import ../shared
    proxy: {
      '/api': 'http://localhost:3000',
      '/socket.io': { target: 'http://localhost:3000', ws: true }
    }
  }
});
