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
        target: 'http://3.36.233.169:8080',
        changeOrigin: true,
        secure: false,
        ws: false,
        timeout: 60000, // 60초 타임아웃 (파일 업로드용)
        rewrite: (path) => {
          console.log('[Vite Proxy] Rewriting path:', path);
          return path;
        },
        configure: (proxy, _options) => {
          proxy.on('error', (err, req, res) => {
            console.error('[Vite Proxy] ❌ Proxy Error:', err.message);
            console.error('[Vite Proxy] Request URL:', req.url);
            console.error('[Vite Proxy] Request Method:', req.method);
            console.error('[Vite Proxy] Error Code:', err.code);
            
            // 연결 오류인 경우 더 자세한 정보 제공
            if (err.code === 'ECONNREFUSED' || err.code === 'ETIMEDOUT' || err.code === 'ENOTFOUND') {
              console.error('[Vite Proxy] ⚠️ 백엔드 서버에 연결할 수 없습니다.');
              console.error('[Vite Proxy] 백엔드 URL: http://3.36.233.169:8080');
            }
            
            if (res && !res.headersSent) {
              res.writeHead(500, {
                'Content-Type': 'text/plain',
              });
              res.end('Proxy error: ' + err.message);
            }
          });
          proxy.on('proxyReq', (proxyReq, req, res) => {
            try {
              // FormData인 경우 Content-Type 헤더를 그대로 유지 (boundary 포함)
              const contentType = req.headers['content-type'];
              if (contentType && contentType.includes('multipart/form-data')) {
                proxyReq.setHeader('Content-Type', contentType);
                console.log('[Vite Proxy] 📤 FormData 요청 전달 중...');
              }
              
              console.log('[Vite Proxy] ➡️ Forwarding:', req.method, req.url);
              console.log('[Vite Proxy] Content-Type:', req.headers['content-type'] || '(없음)');
              console.log('[Vite Proxy] Target:', 'http://3.36.233.169:8080' + req.url);
            } catch (err) {
              // 헤더 설정 실패 시 무시 (이미 설정되었을 수 있음)
              console.warn('[Vite Proxy] ⚠️ Failed to set headers:', err);
            }
          });
          proxy.on('proxyRes', (proxyRes, req, res) => {
            console.log('[Vite Proxy] ✅ Response:', proxyRes.statusCode, req.url);
            
            // 302 리다이렉트인 경우 처리
            if (proxyRes.statusCode === 302) {
              console.log('[Vite Proxy] ⚠️ 302 Redirect detected');
              console.log('[Vite Proxy] Location:', proxyRes.headers.location);
              console.log('[Vite Proxy] ⚠️ 리다이렉트가 발생했습니다. 백엔드 설정을 확인해주세요.');
            }
            
            if (proxyRes.statusCode >= 400) {
              console.log('[Vite Proxy] ⚠️ Error Response Headers:', proxyRes.headers);
            }
          });
        },
      },
    },
  },
})
