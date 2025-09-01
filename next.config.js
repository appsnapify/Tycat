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
    formats: ['image/webp', 'image/avif'], // ✅ ADICIONADO AVIF
    minimumCacheTTL: 86400, // ✅ CACHE 24h
    dangerouslyAllowSVG: false, // ✅ SEGURANÇA
    unoptimized: false, // ✅ GARANTIR otimização
  },
  experimental: {
    optimizeCss: true,
    optimizePackageImports: [
      '@supabase/supabase-js', 
      'lucide-react', 
      'framer-motion',
      '@hookform/resolvers',
      'zod',
      'react-hook-form'
    ], // ✅ EXPANDIR OTIMIZAÇÕES
    webpackBuildWorker: true, // ✅ BUILD PARALELO
    // serverComponentsHmrCache: false, // ✅ REMOVIDO - instável no Next.js 15
    
    // ✅ BUNDLE SPLITTING AGRESSIVO
    esmExternals: 'loose',
    serverMinification: true,
  },
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'],
    } : false,
  },
  poweredByHeader: false,
  compress: true,
  // ✅ OTIMIZAÇÕES VERCEL-ESPECÍFICAS
  // swcMinify é padrão no Next.js 15+ (removido)
  modularizeImports: {
    'lucide-react': {
      transform: 'lucide-react/dist/esm/icons/{{kebabCase member}}',
    },
    '@supabase/supabase-js': {
      transform: '@supabase/supabase-js/dist/module/{{member}}',
    },
  },
  
  // ✅ WEBPACK OPTIMIZATIONS AGRESSIVAS
  webpack: (config, { dev, isServer }) => {
    if (!dev && !isServer) {
      // ✅ Code splitting mais agressivo
      config.optimization.splitChunks = {
        chunks: 'all',
        cacheGroups: {
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            priority: 10,
            chunks: 'all',
          },
          supabase: {
            test: /[\\/]node_modules[\\/]@supabase[\\/]/,
            name: 'supabase',
            priority: 20,
            chunks: 'all',
          },
          common: {
            name: 'common',
            minChunks: 2,
            priority: 5,
            chunks: 'all',
            enforce: true,
          },
        },
      };
      
      // ✅ Tree shaking agressivo
      config.optimization.usedExports = true;
      config.optimization.sideEffects = false;
    }
    
    return config;
  },
  // ✅ HEADERS DE PERFORMANCE
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY'
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin'
          }
        ],
      },
      {
        source: '/images/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable'
          }
        ],
      }
    ]
  },
}

module.exports = nextConfig 