import createBundleAnalyzer from '@next/bundle-analyzer';
import createNextDocs from '@fuma-docs/mdx/config';
import {
  remarkDynamicContent,
  remarkInstall,
} from '@fuma-docs/core/mdx-plugins';
import rehypeKatex from 'rehype-katex';
import remarkMath from 'remark-math';

const withAnalyzer = createBundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
});
/** @type {import('next').NextConfig} */
const config = {
  pageExtensions: ['ts', 'tsx', 'js', 'jsx', 'md', 'mdx'],
  reactStrictMode: true,
  eslint: {
    // Replaced by root workspace command
    ignoreDuringBuilds: true,
  },
};

const withNextDocs = createNextDocs({
  mdxOptions: {
    lastModifiedTime: 'git',
    remarkPlugins: [
      remarkMath,
      remarkDynamicContent,
      [remarkInstall, { Tabs: 'InstallTabs' }],
    ],
    rehypePlugins: (v) => [rehypeKatex, ...v],
  },
});

export default withAnalyzer(withNextDocs(config));
