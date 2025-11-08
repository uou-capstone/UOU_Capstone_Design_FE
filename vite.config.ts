import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    host: true,
    open: false,
    proxy: {
      '/api': {
        target: 'https://michal-unvulnerable-benita.ngrok-free.dev',
        changeOrigin: true,
        secure: true,
        ws: false,
        rewrite: (path) => {
          console.log('[Vite Proxy] Rewriting path:', path);
          return path;
        },
        configure: (proxy, _options) => {
          proxy.on('error', (err, req, res) => {
            console.error('[Vite Proxy] Error:', err.message);
            console.error('[Vite Proxy] Request URL:', req.url);
            console.error('[Vite Proxy] Request Method:', req.method);
            if (res && !res.headersSent) {
              res.writeHead(500, {
                'Content-Type': 'text/plain',
              });
              res.end('Proxy error: ' + err.message);
            }
          });
          proxy.on('proxyReq', (proxyReq, req, res) => {
            // ngrok 헤더 추가
            proxyReq.setHeader('ngrok-skip-browser-warning', 'true');
            console.log('[Vite Proxy] Forwarding request:', req.method, req.url);
            console.log('[Vite Proxy] Target:', 'https://michal-unvulnerable-benita.ngrok-free.dev' + req.url);
          });
          proxy.on('proxyRes', (proxyRes, req, res) => {
            console.log('[Vite Proxy] Response:', proxyRes.statusCode, req.url);
          });
        },
      },
    },
  },
})
