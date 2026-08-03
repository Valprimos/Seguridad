import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Configuración de Vite: proxy de /api hacia el backend Express (puerto 4000)
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
    },
  },
});
