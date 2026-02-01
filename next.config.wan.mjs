/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // Allow cross-origin requests from local network AND ngrok
  allowedDevOrigins: [
    'localhost',
    '127.0.0.1',
    '172.24.156.119', 
    '10.255.255.254', 
    '192.168.0.157',
    '169.254.123.133',
    '192.168.0.40',
    '1baec78a9d9d.ngrok-free.app', // ngrok domain
    // Add more common local IPs as needed
    '192.168.0.1', '192.168.0.100', '192.168.0.101', '192.168.0.102',
    '192.168.1.1', '192.168.1.100', '192.168.1.101', '192.168.1.102',
    '10.0.0.1', '10.0.0.100', '10.0.0.101', '10.0.0.102'
  ],
  // Enable local network access with security headers for WAN
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET, POST, PUT, DELETE, OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization' },
          // Security headers for WAN exposure
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'origin-when-cross-origin' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
        ],
      },
    ]
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Exclude better-sqlite3 and related modules from client-side bundle
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        crypto: false,
        stream: false,
        util: false,
        os: false,
      }
      config.externals = config.externals || []
      config.externals.push('better-sqlite3')
      
      // Add specific module replacements for client-side
      config.resolve.alias = {
        ...config.resolve.alias,
        '@/lib/database/sqlite': false,
        '@/lib/supabase/server': false,
      }
    }
    
    // Fix TensorFlow.js webpack issues
    if (isServer) {
      // Only load TensorFlow.js on server-side
      config.externals = config.externals || []
      config.externals.push('@tensorflow/tfjs-node')
    } else {
      // Exclude TensorFlow.js from client-side bundle
      config.resolve.alias = {
        ...config.resolve.alias,
        '@tensorflow/tfjs-node': false,
        '@/lib/feature-extraction': '@/lib/feature-extraction-fallback',
      }
    }
    
    // Ignore problematic HTML files
    config.module.rules.push({
      test: /\.html$/,
      use: 'ignore-loader'
    })
    
    return config
  },
}

export default nextConfig
