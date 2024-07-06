import { initServer } from '@fumadocs/mdx-remote/github/dev';

initServer();

/** @type {import('next').NextConfig} */
const config = {
  reactStrictMode: true,
};

export default config;
