  import path from 'node:path';
  import { fileURLToPath } from 'node:url';
  import react from '@vitejs/plugin-react';
  import { defineConfig } from 'vite';

  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);

  // https://vite.dev/config/
  export default defineConfig({
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
      
    },
    server: {
      host: true, // Listen on all network addresses (0.0.0.0)
      port: 5173,
      allowedHosts: true,
    },
    preview: {
      host: true,
      port: 5173,
      allowedHosts: true,
    },
  });
