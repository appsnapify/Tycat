/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'xejpwdpumzalewamttjv.supabase.co',
        port: '',
        pathname: '/storage/v1/object/public/**',
      },
      {
        protocol: 'https',
        hostname: 'api.qrserver.com',
        port: '',
        pathname: '/v1/create-qr-code/**',
      },
    ],
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
  
  // Configuração de variáveis de ambiente
  env: {
    NEXT_PUBLIC_SUPABASE_URL: 'https://xejpwdpumzalewamttjv.supabase.co',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhlanB3ZHB1bXphbGV3YW10dGp2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDMzNjc2ODQsImV4cCI6MjA1ODk0MzY4NH0.8HWAgcSoPL70uJ8OJXu3m7GD6NB-MhZTuBjurWXU7eI'
  }
}

module.exports = nextConfig 