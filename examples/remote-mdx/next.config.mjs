import createGithub from '@fumadocs/mdx-remote/github';

/** @type {import('next').NextConfig} */
const config = {
  reactStrictMode: true,
};

const withGithub = createGithub({
  directory: 'content/docs',
  saveFile: '.fumadocs/cache.json',
  baseUrl: '/docs',
});

export default withGithub(config);
