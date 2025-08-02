import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import svgr from 'vite-plugin-svgr';
import { visualizer } from 'rollup-plugin-visualizer';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current directory.
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [
      react(),
      svgr({
        svgrOptions: {
          icon: true,
        },
      }),
      mode === 'analyze' && visualizer({
        open: true,
        filename: 'dist/stats.html',
        gzipSize: true,
        brotliSize: true,
      }),
    ].filter(Boolean),
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
        // Add other aliases as needed
      },
    },
    server: {
      port: 3000,
      open: true,
      // Configure proxy if needed for API requests
      // proxy: {
      //   '/api': {
      //     target: 'http://localhost:5000',
      //     changeOrigin: true,
      //     rewrite: (path) => path.replace(/^\/api/, ''),
      //   },
      // },
    },
    base: '/',
  build: {
      outDir: 'dist',
      sourcemap: mode !== 'production',
      rollupOptions: {
        output: {
          manualChunks: {
            react: ['react', 'react-dom', 'react-router-dom'],
            ethers: ['ethers', '@ethersproject/providers'],
          },
        },
      },
      // Increase chunk size warning limit
      chunkSizeWarningLimit: 1000,
    },
    define: {
      'process.env': {
        VITE_DEFAULT_CHAIN_ID: env.VITE_DEFAULT_CHAIN_ID || '31337',
        VITE_SUPPORTED_CHAINS: env.VITE_SUPPORTED_CHAINS || '31337',
        VITE_NETWORK_NAMES: env.VITE_NETWORK_NAMES || JSON.stringify({ '31337': 'Localhost' }),
        VITE_CONTRACT_ADDRESS: JSON.stringify(env.VITE_CONTRACT_ADDRESS || ''),
      },
    },
    optimizeDeps: {
      esbuildOptions: {
        // Node.js global to browser globalThis
        define: {
          global: 'globalThis',
        },
      },
      // Add any other dependencies that need to be pre-bundled
      include: ['@metamask/detect-provider'],
    },
  };
});
