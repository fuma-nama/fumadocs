/** @type {import('next').NextConfig} */
const config = {
  pageExtensions: ['ts', 'tsx', 'js', 'jsx'],
  reactStrictMode: true,
  eslint: {
    // Replaced by root workspace command
    ignoreDuringBuilds: true
  }
}

const { withContentlayer } = require('next-contentlayer')

module.exports = withContentlayer(config)
