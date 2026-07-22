import createBundleAnalyzer from '@next/bundle-analyzer';
import { createMDX } from 'fumadocs-mdx/next';
import { createNextStory } from '@fumadocs/story/next';
import type { NextConfig } from 'next';

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
  serverExternalPackages: ['ts-morph', 'typescript', 'twoslash', 'shiki', '@takumi-rs/core'],
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
    return [
      {
        source: '/docs/versioning',
        destination: '/docs/navigation',
        permanent: false,
      },
    ];
  },
};

const withStory = createNextStory();
const withMDX = createMDX();

export default withAnalyzer(withStory(withMDX(config)));
