import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  base: '/kindergarten-dienstplan-app/',
  plugins: [react()],
  server: {
    host: true, // Im Netzwerk erreichbar (0.0.0.0)
  },
})
