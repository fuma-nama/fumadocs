import { initServer } from '@fumadocs/mdx-remote/github/dev';

// TODO: Handle the WebSocket server more gracefully
initServer({
  files: ['./content'],
});

/** @type {import('next').NextConfig} */
const config = {
  reactStrictMode: true,
};

export default config;
