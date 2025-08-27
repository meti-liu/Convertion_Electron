import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { resolve } from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],
  server: {
    port: 5177,
    open: '/app/renderer/index.html'
  },
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'app/renderer/index.html'),
        network: resolve(__dirname, 'app/renderer/network.html'),
      },
    },
  },
  root: './',
  publicDir: 'app/renderer/assets',
});