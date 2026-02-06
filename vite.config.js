import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { writeFileSync } from 'fs'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    {
      name: 'add-nojekyll',
      closeBundle() {
        writeFileSync('docs/.nojekyll', '')
      }
    }
  ],
  base: '/water-tracker/',
  build: {
    outDir: 'docs',
    emptyOutDir: true,
  },
})
