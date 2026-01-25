import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  outputFileTracingRoot: __dirname,
  eslint: {
    ignoreDuringBuilds: false,
    dirs: ['src'],
  },
  typescript: {
    ignoreBuildErrors: false,
  },
}

export default nextConfig
