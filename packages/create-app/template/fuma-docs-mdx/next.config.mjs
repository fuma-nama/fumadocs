import createNextDocsMDX from '@fuma-docs/mdx/config';

const withMDX = createNextDocsMDX();

/** @type {import('next').NextConfig} */
const config = {
  reactStrictMode: true,
};

export default withMDX(config);
