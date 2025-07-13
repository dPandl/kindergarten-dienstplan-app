import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  base: '/kindergarten-dienstplan-app/', // <-- Diese Zeile wurde hinzugefügt!
  plugins: [react()],
})
