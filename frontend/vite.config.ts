import path from 'node:path'
import { defineConfig, loadEnv } from 'vite'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'

export default defineConfig(({ mode }) => {
  const envDir = path.resolve(process.cwd(), '..')
  const fileEnv = loadEnv(mode, envDir, '')
  const proxyTarget =
    fileEnv.VITE_DEV_PROXY_TARGET ||
    process.env.VITE_DEV_PROXY_TARGET ||
    'http://127.0.0.1:8000'

  return {
    envDir,
    plugins: [react(), babel({ presets: [reactCompilerPreset()] })],
    server: {
      proxy: {
        '/api': {
          target: proxyTarget,
          changeOrigin: true,
        },
      },
    },
  }
})