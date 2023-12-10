import createNextDocsMDX from 'next-docs-mdx/config';

const withFumaMDX = createNextDocsMDX();

/** @type {import('next').NextConfig} */
const config = {
  reactStrictMode: true,
};

export default withFumaMDX(config);
