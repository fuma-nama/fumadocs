import { tegami } from 'tegami';
import { createCli } from 'tegami/cli';
import { github } from 'tegami/plugins/github';

const paper = tegami({
  plugins: [
    github({
      repo: 'fuma-nama/fumadocs',
    }),
  ],
  ignore: [/^example-/, 'docs', 'root', 'shared', 'tsconfig', 'vite-data'],

  groups: {
    fumadocs: {
      syncBump: true,
      syncGitTag: true,
    },
    cli: {
      syncBump: true,
      syncGitTag: true,
    },
  },
  packages: {
    'fumadocs-ui': { group: 'fumadocs' },
    '@fumadocs/base-ui': { group: 'fumadocs' },
    'fumadocs-core': { group: 'fumadocs' },
    'create-fumadocs-app': { group: 'cli' },
    'create-fumadocs-versions': { group: 'cli' },
  },
});

void createCli(paper).parseAsync();
