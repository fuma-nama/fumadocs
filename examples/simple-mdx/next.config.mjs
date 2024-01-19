import createNextDocsMDX from 'fumadocs-mdx/config';

const withFumaMDX = createNextDocsMDX();

/** @type {import('next').NextConfig} */
const config = {
  reactStrictMode: true,
};

export default withFumaMDX(config);
