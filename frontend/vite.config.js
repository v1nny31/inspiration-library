import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import { libraryApi } from './server/api.js'

// https://vite.dev/config/
export default defineConfig({
  // The library lives at the repo root (../library) so it can be committed.
  plugins: [react(), tailwindcss(), libraryApi({ dir: fileURLToPath(new URL('../library', import.meta.url)) })],
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: 'app',
          include: ['src/**/*.test.{js,jsx}'],
          environment: 'jsdom',
          setupFiles: ['./src/setupTests.js'],
          globals: true,
        },
      },
      {
        extends: true,
        test: {
          name: 'server',
          include: ['server/**/*.test.js'],
          environment: 'node',
        },
      },
    ],
  },
})
