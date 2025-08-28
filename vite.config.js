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
    // 确保打包后的资源路径正确
    outDir: 'dist_web',
    assetsDir: 'assets',
    // 确保生成的资源使用相对路径
    cssCodeSplit: true,
  },
  // 设置基础路径为相对路径，这样打包后的应用可以正确加载资源
  base: './',
  root: './',
  publicDir: 'app/renderer/assets',
  // 添加别名配置，解决模块导入问题
  resolve: {
    alias: {
      'vue': resolve(__dirname, 'node_modules/vue/dist/vue.esm-browser.js'),
      'element-plus': resolve(__dirname, 'node_modules/element-plus/dist/index.full.mjs'),
      '@': resolve(__dirname, 'app/renderer/src'),
    }
  },
});