import createBundleAnalyzer from '@next/bundle-analyzer'
import createNextDocs from 'next-docs-mdx/config'
import { remarkDynamicContent, remarkInstall } from 'next-docs-zeta/mdx-plugins'
import rehypeKatex from 'rehype-katex'
import remarkMath from 'remark-math'

const withAnalyzer = createBundleAnalyzer({
  enabled: process.env.ANALYZE === 'true'
})

/** @type {import('next').NextConfig} */
const config = {
  pageExtensions: ['ts', 'tsx', 'js', 'jsx', 'md', 'mdx'],
  reactStrictMode: true,
  webpack: config => {
    // Next.js can't load shikiji without this config
    config.module.rules.push({
      test: /\.mjs$/,
      include: /node_modules/,
      type: 'javascript/auto'
    })
    return config
  },
  eslint: {
    // Replaced by root workspace command
    ignoreDuringBuilds: true
  }
}

const withNextDocs = createNextDocs({
  mdxOptions: {
    remarkPlugins: [
      remarkMath,
      remarkDynamicContent,
      [remarkInstall, { Tabs: 'InstallTabs' }]
    ],
    rehypePlugins: [rehypeKatex]
  }
})

export default withAnalyzer(withNextDocs(config))
