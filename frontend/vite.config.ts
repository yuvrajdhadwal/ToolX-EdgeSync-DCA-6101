import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/register': 'http://localhost:8000',
      '/token': 'http://localhost:8000',
      '/upload': 'http://localhost:8000',
      '/verify-token': "http://localhost:8000",
      '/add_device': 'http://localhost:8000',
      '/get_devices': 'http://localhost:8000',
      '/remove_device': 'http://localhost:8000',
      '/firmware': 'http://localhost:8000', 
      '/devmng': 'http://localhost:8000',
      '/firmware-device-types': 'http://localhost:8000',
      '/users': 'http://localhost:8000',
    }
  }
})
