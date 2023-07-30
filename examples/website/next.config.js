/** @type {import('next').NextConfig} */
const config = {
  pageExtensions: ['ts', 'tsx', 'js', 'jsx'],
  reactStrictMode: true,
  images: {
    domains: ['i.pravatar.cc']
  }
}

const { withContentlayer } = require('next-contentlayer')

module.exports = withContentlayer(config)
