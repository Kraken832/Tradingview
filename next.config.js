/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Market-data + auth API routes use the Node.js runtime (fs, crypto, jsonwebtoken).
  experimental: {},
};

module.exports = nextConfig;
