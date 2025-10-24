import { defineConfig } from 'vite'
import RubyPlugin from 'vite-plugin-ruby'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [
    RubyPlugin(),
    react({
      fastRefresh: true,
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './app/javascript'),
      '@/components': path.resolve(__dirname, './app/javascript/components'),
      '@/lib': path.resolve(__dirname, './app/javascript/lib'),
      '@/hooks': path.resolve(__dirname, './app/javascript/hooks'),
    },
  },
  server: {
    hmr: {
      host: 'localhost',
      protocol: 'ws',
    },
  },
})
