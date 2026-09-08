import type { NextConfig } from 'next'
const config: NextConfig = {
  turbopack: { root: process.cwd() },
  async rewrites() { return process.env.NETLIFY ? [] : [{ source: '/api/:path*', destination: 'http://127.0.0.1:3001/api/:path*' }] },
}
export default config
