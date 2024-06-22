import createGithub from '@fumadocs/mdx-remote/github';

/** @type {import('next').NextConfig} */
const config = {
  reactStrictMode: true,
};

const withGithub = createGithub({
  directory: 'content/docs',
  saveFile: '.fumadocs/cache.json',
  baseUrl: '/docs',
  // github information
  owner: '<github-username-here>',
  repo: '<github-repo-here>',
  branch: '<github-branch-here>',
});

export default withGithub(config);
