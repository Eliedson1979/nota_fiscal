// import { defineConfig } from 'vite'
// import react from '@vitejs/plugin-react'
// import fs from 'fs'

// export default defineConfig({
//   plugins: [react()],
//   server: {
//     host: true,
//     https: {
//       key: fs.readFileSync('/tmp/network.key'),
//       cert: fs.readFileSync('/tmp/network.crt'),
//     },
//     proxy: {
//       '/api': {
//         target: 'http://localhost:3001',
//         changeOrigin: true,
//       },
//     },
//   },
// })

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
})