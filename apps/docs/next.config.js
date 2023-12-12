const withNextra = require('nextra')({
  theme: 'nextra-theme-docs',
  themeConfig: './theme.config.tsx',
})

/**
 * @type {import('next').NextConfig}
 */
const nextConfig =
  process.env.NODE_ENV === 'production'
    ? {
        output: 'export',
        basePath: '/docs/main',
        assetPrefix: '/docs/main/',
        poweredByHeader: true,
        images: {
          unoptimized: true,
        },
        distDir: '../../dist/apps/docs',
      }
    : {
        basePath: '/docs/main',
        assetPrefix: '/docs/main/',
        poweredByHeader: true,
        images: {
          unoptimized: true,
        },
      }

module.exports = withNextra(nextConfig)
