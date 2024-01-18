/** @type {import('next').NextConfig} */
const config = {
  reactStrictMode: true,
};

const { withContentlayer } = require('next-contentlayer');

module.exports = withContentlayer(config);
