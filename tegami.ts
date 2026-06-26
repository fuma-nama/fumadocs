import { tegami } from 'tegami';
import { createCli } from 'tegami/cli';
import { github } from 'tegami/plugins/github';
import { x } from 'tinyexec';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFileSync, writeFileSync } from 'node:fs';

const paper = tegami({
  npm: {
    updateLockFile: true,
  },
  plugins: [
    github({
      repo: 'fuma-nama/fumadocs',
      versionPr: {
        base: 'dev',
      },
    }),
    {
      name: 'custom',
      cli: {
        publishPlanApplied() {
          updateStackblitzVersions();
        },
      },
      async willPublish({ pkg }) {
        console.log(`building ${pkg.name}`);
        await x('pnpm', ['turbo', 'run', 'build', `--filter=${pkg.name}`], {
          throwOnError: true,
        });
      },
    },
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

/**
 * Update template for StackBlitz
 */
function updateStackblitzVersions() {
  console.log('updating StackBlitz versions');
  const root = dirname(fileURLToPath(import.meta.url));

  const packageDirs = {
    'fumadocs-core': 'packages/core',
    'fumadocs-mdx': 'packages/mdx',
    'fumadocs-ui': 'packages/radix-ui',
  };

  const stackblitzPath = join(root, 'examples/stackblitz/package.json');
  const stackblitz = JSON.parse(readFileSync(stackblitzPath, 'utf8'));

  for (const [name, dir] of Object.entries(packageDirs)) {
    if (!stackblitz.dependencies || !(name in stackblitz.dependencies)) continue;

    const { version } = JSON.parse(readFileSync(join(root, dir, 'package.json'), 'utf8'));
    stackblitz.dependencies[name] = version;
  }

  writeFileSync(stackblitzPath, `${JSON.stringify(stackblitz, null, 2)}\n`);
}
