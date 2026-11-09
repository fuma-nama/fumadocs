import createBundleAnalyzer from '@next/bundle-analyzer';
import { createMDX } from 'fumadocs-mdx/next';
import { createNextStory } from '@fumadocs/story/next';
import type { NextConfig } from 'next';
import { defaultFramework, frameworks } from './lib/framework.ts';
import { frameworkPages } from './lib/remark-framework-links.ts';

const withAnalyzer = createBundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
});

const config: NextConfig = {
  reactStrictMode: true,
  logging: {
    fetches: {
      fullUrl: true,
    },
  },
  allowedDevOrigins: ['192.168.52.84'],
  serverExternalPackages: ['ts-morph', 'typescript', 'shiki', '@takumi-rs/core'],
  // the landing page reads these when it re-renders
  outputFileTracingIncludes: {
    '/': ['./node_modules/fumadocs-ui/css/**/*.css', './.type-tables/**'],
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'avatars.githubusercontent.com',
        port: '',
      },
    ],
  },
  async redirects() {
    const values = frameworks.map((item) => item.value).join('|');
    const pages = [...frameworkPages].join('|');

    return [
      // the pages of each framework became one page per framework
      {
        source: `/docs/:page(manual-installation|internationalization)/:framework(${values})`,
        destination: '/docs/:framework/:page',
        permanent: true,
      },
      {
        source: '/docs/integrations/story/:page(next|vite)',
        destination: '/docs/integrations/story#installation',
        permanent: true,
      },
      {
        source: `/docs/:page(${pages})/:path*`,
        destination: `/docs/${defaultFramework}/:page/:path*`,
        permanent: false,
      },
      // Markdown versions, see `proxy.ts`
      {
        source: `/docs/:path((?:${pages})(?:/[^.]+)?\\.mdx?)`,
        destination: `/docs/${defaultFramework}/:path`,
        permanent: false,
      },
    ];
  },
};

const withStory = createNextStory();
const withMDX = createMDX();

export default withAnalyzer(withStory(withMDX(config)));
