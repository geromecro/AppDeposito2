/** @type {import('next').NextConfig} */
const nextConfig = {
  // Disable ETags for cache busting
  generateEtags: false,

  // Disable page caching for fresh data
  onDemandEntries: {
    maxInactiveAge: 0,
    pagesBufferLength: 0,
  },

  // Force revalidation on every request
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=0, s-maxage=0, must-revalidate',
          },
        ],
      },
    ];
  },

  // Allow Supabase Storage images
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
      },
    ],
  },
};

module.exports = nextConfig;
