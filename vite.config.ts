import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    // Garante que o valor seja uma string vazia se undefined, evitando erros de replace no build
    'process.env.API_KEY': JSON.stringify(process.env.API_KEY || '')
  }
});