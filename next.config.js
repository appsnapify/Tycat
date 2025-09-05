/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },

  // Configurações básicas para resolver erro crítico
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'xejpwdpumzalewamttjv.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
      {
        protocol: 'https',
        hostname: 'api.qrserver.com',
        pathname: '/v1/create-qr-code/**',
      },
    ],
  },

  // Configurações essenciais mantidas
  poweredByHeader: false,
  compress: true,

  // ✅ CONFIGURAÇÃO SIMPLIFICADA PARA EVITAR ERROS
  experimental: {
    optimizePackageImports: ['lucide-react'],
  },
}

module.exports = nextConfig 