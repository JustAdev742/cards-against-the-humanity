import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Relative base so the build works on GitHub Pages under /<repo>/,
// on a custom domain, and from the local filesystem without changes.
export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss()],
  build: {
    target: 'es2022',
    rollupOptions: {
      output: {
        // Split the big third-party pieces so a repeat visit only refetches
        // what actually changed.
        manualChunks(id) {
          if (!id.includes('node_modules')) return
          if (/[\/]node_modules[\/](react|react-dom|scheduler)[\/]/.test(id)) return 'react'
          if (id.includes('motion') || id.includes('framer')) return 'motion'
          if (id.includes('peerjs')) return 'peer'
          if (id.includes('qrcode')) return 'qr'
          return 'vendor'
        },
      },
    },
  },
})
