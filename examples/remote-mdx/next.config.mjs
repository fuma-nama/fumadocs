import createGithub from '@fumadocs/mdx-remote/github';

/** @type {import('next').NextConfig} */
const config = {
  reactStrictMode: true,
};

const withGithub = createGithub({
  // leave empty if you want to use the root directory
  githubDirectory: '<github-directory-here>',
  // this is only used for local development
  localDirectory: 'content/docs',
  // or you can use `directory` instead of `localDirectory` and `githubDirectory`
  // to have the same directory in both local and github used
  // directory: 'content/docs',

  // where to save the cache relative to `localDirectory`/`directory`
  baseUrl: '/docs',

  // general github information
  owner: '<github-username-here>',
  repo: '<github-repo-here>',
  branch: '<github-branch-here>',
  // add a token if the repo is private
  // token: '<github-token-here>',
});

export default withGithub(config);
