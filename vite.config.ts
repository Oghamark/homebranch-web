import { reactRouter } from "@react-router/dev/vite";
import { defineConfig, loadEnv } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

const env = loadEnv(process.env.NODE_ENV as string, process.cwd(), 'VITE_')

export default defineConfig({
  envDir: ".",
  envPrefix: "VITE_",
  plugins: [reactRouter(), tsconfigPaths()],
  server: {
    allowedHosts: [process.env.ALLOWED_HOST ?? "localhost"],
    cors: {
        origin: process.env.CORS_ORIGIN,
    },
      proxy: {
        '/api': {
            target: env.VITE_API_ROOT,
            changeOrigin: true,
            secure: false,
            rewrite: (path) => path.replace(/^\/api/, '')
        },
          '/auth': {
            target: env.VITE_AUTHENTICATION_ROOT,
            changeOrigin: true,
            secure: false,
            rewrite: (path) => path.replace(/^\/auth/, '')
          }
      }
  }
});
