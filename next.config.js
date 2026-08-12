const withPWA = require('next-pwa')({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  register: true,
  skipWaiting: true,
  // Custom service worker source that handles push events
  customWorkerDir: 'src/sw',
  // Fallback pages for offline
  fallbacks: {
    document: '/offline.html',
  },
  runtimeCaching: [
    // Cache menu/products API for offline access (NetworkFirst with fallback)
    {
      urlPattern: /\/api\/productos/i,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'menu-api-cache',
        networkTimeoutSeconds: 10,
        expiration: {
          maxEntries: 50,
          maxAgeSeconds: 24 * 60 * 60, // 24 hours
        },
        cacheableResponse: {
          statuses: [0, 200],
        },
      },
    },
    // Cache product images for offline menu viewing
    {
      urlPattern: /^https:\/\/.*\.supabase\.co\/storage\/v1\/object\/public\/.*/i,
      handler: 'CacheFirst',
      options: {
        cacheName: 'product-images-cache',
        expiration: {
          maxEntries: 100,
          maxAgeSeconds: 7 * 24 * 60 * 60, // 7 days
        },
        cacheableResponse: {
          statuses: [0, 200],
        },
      },
    },
    // Start URL (home/menu page) - cache for offline
    {
      urlPattern: /^\/(menu|cliente\/menu)?$/i,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'menu-pages-cache',
        networkTimeoutSeconds: 10,
        expiration: {
          maxEntries: 10,
          maxAgeSeconds: 24 * 60 * 60, // 24 hours
        },
      },
    },
    // Static assets (JS, CSS) with StaleWhileRevalidate
    {
      urlPattern: /\/_next\/static\/.*/i,
      handler: 'StaleWhileRevalidate',
      options: {
        cacheName: 'next-static-assets',
        expiration: {
          maxEntries: 64,
          maxAgeSeconds: 24 * 60 * 60, // 24 hours
        },
      },
    },
    // Google Fonts
    {
      urlPattern: /^https:\/\/fonts\.(?:gstatic|googleapis)\.com\/.*/i,
      handler: 'CacheFirst',
      options: {
        cacheName: 'google-fonts',
        expiration: {
          maxEntries: 10,
          maxAgeSeconds: 365 * 24 * 60 * 60, // 1 year
        },
      },
    },
    // General API calls (non-productos) - NetworkFirst
    {
      urlPattern: /\/api\/.*/i,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'general-api-cache',
        networkTimeoutSeconds: 10,
        expiration: {
          maxEntries: 32,
          maxAgeSeconds: 24 * 60 * 60, // 24 hours
        },
        cacheableResponse: {
          statuses: [0, 200],
        },
      },
    },
  ],
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Optimize for serverless deployment on Vercel
  poweredByHeader: false,
  // Compress responses
  compress: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        pathname: '/**',
      },
    ],
    // Optimize image loading
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 60 * 60 * 24, // 24 hours
  },
  // Security headers (complement vercel.json for non-Vercel environments)
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
        ],
      },
    ];
  },
};

module.exports = withPWA(nextConfig);
