import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { viteSingleFile } from 'vite-plugin-singlefile'

// Gera o PDV de espetinho como um único arquivo (pdv/pdv-espetinho.html) que funciona aberto direto no Chrome, sem servidor.
export default defineConfig({
  plugins: [react(), viteSingleFile()],
  build: {
    outDir: 'dist-pdv',
    emptyOutDir: true,
    rollupOptions: { input: 'pdv.html' },
  },
})
