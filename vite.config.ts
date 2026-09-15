import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const publicUrl = process.env.PUBLIC_URL
const allowedHosts = publicUrl ? [new URL(publicUrl).hostname] : []

export default defineConfig({
  plugins: [react()],
  experimental: { bundledDev: true },
  server: { allowedHosts, strictPort: true },
  preview: { allowedHosts, strictPort: true },
})
