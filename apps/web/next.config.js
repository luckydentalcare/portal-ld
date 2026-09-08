/** @type {import('next').NextConfig} */
const backendUrl = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
const cleanBackendUrl = backendUrl.replace(/\/$/, '');
const apiBaseUrl = cleanBackendUrl.endsWith('/api') ? cleanBackendUrl : `${cleanBackendUrl}/api`;

const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@patient-portal/shared'],
  env: {
    // Bakes the single BACKEND_URL into client-accessible env during build
    NEXT_PUBLIC_BACKEND_API_URL: apiBaseUrl,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        pathname: '/**',
      }
    ],
  },
  async rewrites() {
    return [
      {
        source: '/favicon.ico',
        destination: '/icon.svg'
      },
      {
        source: '/staff',
        destination: '/stuffs'
      },
      {
        source: '/staff/:path*',
        destination: '/stuffs/:path*'
      }
    ];
  }
};

module.exports = nextConfig;
