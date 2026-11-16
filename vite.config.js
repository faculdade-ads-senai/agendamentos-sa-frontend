import { defineConfig, loadEnv } from 'vite'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const proxy = { '/api': env.API_PROXY_TARGET || 'http://localhost:8080' }
  return {
    plugins: [tailwindcss()],
    server: { proxy },
    preview: { proxy },
  }
})

