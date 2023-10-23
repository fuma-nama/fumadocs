import createBundleAnalyzer from '@next/bundle-analyzer'
import createNextDocs from 'next-docs-mdx/config'
import { remarkDynamicContent } from 'next-docs-zeta/mdx-plugins'
import rehypeKatex from 'rehype-katex'
import remarkMath from 'remark-math'

const withAnalyzer = createBundleAnalyzer({
  enabled: process.env.ANALYZE === 'true'
})

/** @type {import('next').NextConfig} */
const config = {
  pageExtensions: ['ts', 'tsx', 'js', 'jsx', 'md', 'mdx'],
  reactStrictMode: true,
  eslint: {
    // Replaced by root workspace command
    ignoreDuringBuilds: true
  }
}

const withNextDocs = createNextDocs({
  mdxOptions: {
    remarkPlugins: [remarkMath, remarkDynamicContent],
    rehypePlugins: [rehypeKatex]
  }
})

export default withAnalyzer(withNextDocs(config))
