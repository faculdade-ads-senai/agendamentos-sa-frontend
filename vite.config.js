import { defineConfig, loadEnv } from 'vite'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const target = env.API_PROXY_TARGET || 'http://localhost:8080'
  const proxy = Object.fromEntries(['/api', '/oauth2', '/login/oauth2', '/convite'].map(path => [path, { target }]))
  return {
    plugins: [tailwindcss()],
    build: { target: 'es2022' },
    server: { port: 5173, strictPort: true, proxy },
    preview: { proxy },
  }
})

