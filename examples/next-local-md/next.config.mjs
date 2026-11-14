/** @type {import('next').NextConfig} */
const config = {
  reactStrictMode: true,
  async rewrites() {
    return [
      {
        source: '/docs/:path*.md',
        destination: '/llms.mdx/docs/:path*.md',
      },
      {
        source: '/docs/:path*/llms-full.txt',
        destination: '/llms.mdx/docs/:path*/llms-full.txt',
      },
    ];
  },
};

export default config;
