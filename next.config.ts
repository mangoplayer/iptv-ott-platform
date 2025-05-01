import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'begenal.shop',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'image.tmdb.org',
        pathname: '/**',
      },
      {
        protocol: 'http',
        hostname: '**', // Allow all HTTP hosts for IPTV stream thumbnails
      },
      {
        protocol: 'https',
        hostname: '**', // Allow all HTTPS hosts for IPTV stream thumbnails
      },
    ],
    unoptimized: true, // For external images that might not be optimizable
  },
};

export default nextConfig;
