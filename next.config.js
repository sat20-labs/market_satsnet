/** @type {import('next').NextConfig} */

const path = require('path');
const nextConfig = {
  output: 'export',
  distDir: 'out',
  trailingSlash: true,
  webpack: (config, { isServer }) => {
    // 启用 WebAssembly 实验特性
    config.resolve.alias['bitcore-lib'] = path.resolve(
      __dirname,
      'node_modules/bitcore-lib',
    );
    return config;
  },
  images: {
    unoptimized: true,
  },
};

module.exports = nextConfig;
