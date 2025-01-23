/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  images: {
    domains: ['jtnqzktjrljlzlyfprlc.supabase.co'],
  },
  experimental: {
    serverActions: {
      allowedOrigins: ['localhost:3000', 'zenzen.vercel.app'],
    },
  }
}

export default nextConfig 