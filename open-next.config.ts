import { defineConfig } from "@opennextjs/cloudflare"

export default defineConfig({
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
})
