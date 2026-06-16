import { crx } from '@crxjs/vite-plugin';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';
import { manifest } from './src/manifest';

export default defineConfig({
  plugins: [react(), crx({ manifest })],
  test: {
    environment: 'jsdom',
    setupFiles: ['src/test/setup.ts'],
  },
});
