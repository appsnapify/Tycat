/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    domains: ['*'], // Permitir imagens de qualquer domínio (ajuste conforme necessário)
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    formats: ['image/webp'],
  },
  experimental: {
    optimizeCss: true,    // Otimização de CSS
    optimizeServerReact: true, // Otimização do React no servidor
  },
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'],
    } : false,
  },
  poweredByHeader: false, // Remove o header X-Powered-By para segurança
  compress: true, // Habilita compressão Gzip
}

module.exports = nextConfig 