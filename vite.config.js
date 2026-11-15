import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'

const proxy = {
  '/login': process.env.API_PROXY_TARGET || 'http://localhost:8080',
  '/api': process.env.API_PROXY_TARGET || 'http://localhost:8080',
}

export default defineConfig({
  plugins: [tailwindcss()],
  server: { proxy },
  preview: { proxy },
})

