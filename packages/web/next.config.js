/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Increase body size limit for audio file uploads
  experimental: {
    serverActions: {
      bodySizeLimit: '25mb',
    },
  },
}

module.exports = nextConfig
