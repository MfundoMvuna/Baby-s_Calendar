/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.s3.af-south-1.amazonaws.com',
      },
    ],
  },
};

module.exports = nextConfig;
