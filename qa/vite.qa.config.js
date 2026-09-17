import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
export default defineConfig({
  plugins: [react()],
  resolve: { alias: [{ find: /.*\/lib\/supabaseClient(\.js)?$/, replacement: path.resolve(__dirname, 'fakeSupabase.js') }] },
  build: { outDir: path.resolve(__dirname, 'dist'), emptyOutDir: true },
  define: { 'import.meta.env.VITE_SUPABASE_URL': '"x"', 'import.meta.env.VITE_SUPABASE_ANON_KEY': '"x"' },
})
