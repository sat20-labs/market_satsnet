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
    config.experiments = {
      ...config.experiments,
      syncWebAssembly: true, // 使用异步 WebAssembly
      // 或者启用 syncWebAssembly，但它已经被弃用
      // syncWebAssembly: true, // Webpack 4 风格的同步 WebAssembly
    };

    return config;
  },
  images: {
    unoptimized: true,
  },
  experimental: {
    missingSuspenseWithCSRBailout: false,
  },
};

module.exports = nextConfig;
