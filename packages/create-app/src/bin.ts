#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import {
  cancel,
  confirm,
  group,
  intro,
  isCancel,
  outro,
  select,
  spinner,
  text,
} from '@clack/prompts';
import pc from 'picocolors';
import { getPackageManager, managers } from './auto-install';
import { create, type Template, type TemplatePlugin } from './index';
import { isCI, templates } from './constants';
import { Option, program } from '@commander-js/extra-typings';

const command = program
  .argument('[name]', 'the project name')
  .option('--src', '(Next.js only) enable `src/` directory')
  .option('--install', 'install packages automatically')
  .option('--no-git', 'disable auto Git repository initialization')
  .addOption(
    new Option(
      '--linter <name>',
      'configure a linter/formatter, ESLint is currently Next.js only.',
    ).choices(['eslint', 'biome']),
  )
  .addOption(
    new Option('--search <name>', 'configure a search solution').choices([
      'orama',
      'orama-cloud',
    ]),
  )
  .addOption(
    new Option('--template <name>', 'choose a template').choices(
      templates.map((item) => item.value),
    ),
  )
  .addOption(
    new Option('--pm <name>', 'choose a package manager')
      .choices(managers)
      .default(getPackageManager()),
  );

async function main(): Promise<void> {
  command.parse(process.argv);
  const defaultName = command.args[0];
  const config = command.opts();
  intro(pc.bgCyan(pc.bold('Create Fumadocs App')));

  const options = await group(
    {
      name: async () => {
        if (defaultName) return defaultName;
        if (isCI) return 'untitled';

        return text({
          message: 'Project name',
          placeholder: 'my-app',
          defaultValue: 'my-app',
        });
      },
      template: async () => {
        if (config.template) return config.template;
        if (isCI) return '+next+fuma-docs-mdx';

        return select<Template>({
          message: 'Choose a template',
          initialValue: '+next+fuma-docs-mdx',
          options: templates,
        });
      },
      src: async ({ results }: { results: { template?: Template } }) => {
        if (config.src !== undefined) return config.src;
        if (isCI || !results.template?.startsWith('+next')) return false;

        return confirm({
          message: 'Use `/src` directory?',
          initialValue: false,
        });
      },
      lint: async ({ results }: { results: { template?: Template } }) => {
        if (config.linter !== undefined) return config.linter;
        if (isCI) return 'disabled';

        return select({
          message: 'Configure linter?',
          options:
            results.template === '+next+fuma-docs-mdx'
              ? [
                  {
                    value: 'disabled',
                    label: 'Disabled',
                  },
                  {
                    value: 'eslint',
                    label: 'ESLint',
                  },
                  {
                    value: 'biome',
                    label: 'Biome',
                  },
                ]
              : [
                  {
                    value: 'disabled',
                    label: 'Disabled',
                  },
                  {
                    value: 'biome',
                    label: 'Biome',
                  },
                ],
        });
      },
      search: async () => {
        if (config.search !== undefined) return config.search;
        if (isCI) return 'orama';

        return select({
          message: 'Choose a search solution?',
          options: [
            {
              value: 'orama',
              label: 'Default',
              hint: 'local search powered by Orama, recommended',
            },
            {
              value: 'orama-cloud',
              label: 'Orama Cloud',
              hint: '3rd party search solution, signup needed',
            },
          ],
        });
      },
      installDeps: async () => {
        if (config.install !== undefined) return config.install;
        if (isCI) return false;

        return confirm({
          message: `Do you want to install packages automatically? (detected as ${config.pm})`,
        });
      },
    },
    {
      onCancel: () => {
        cancel('Installation Stopped.');
        process.exit(0);
      },
    },
  );

  const projectName = options.name.toLowerCase().replace(/\s/, '-');
  if (!isCI) await checkDir(projectName);

  const info = spinner();
  info.start(`Generating Project`);
  const plugins: TemplatePlugin[] = [];

  if (options.src) {
    const { nextUseSrc } = await import('./plugins/next-use-src');
    plugins.push(nextUseSrc());
  }

  if (options.search === 'orama-cloud') {
    const { oramaCloud } = await import('./plugins/orama-cloud');
    plugins.push(oramaCloud());
  }

  if (options.lint === 'eslint') {
    const { eslint } = await import('./plugins/eslint');
    plugins.push(eslint());
  }

  if (options.lint === 'biome') {
    const { biome } = await import('./plugins/biome');
    plugins.push(biome());
  }

  await create({
    packageManager: config.pm,
    template: options.template,
    outputDir: projectName,
    installDeps: options.installDeps,
    initializeGit: config.git,
    plugins,
    log: (message) => {
      info.message(message);
    },
  });

  info.stop('Project Generated');

  outro(pc.bgGreen(pc.bold('Done')));

  console.log(pc.bold('\nOpen the project'));
  console.log(pc.cyan(`cd ${projectName}`));

  console.log(pc.bold('\nRun Development Server'));
  if (config.pm === 'npm' || config.pm === 'bun') {
    console.log(pc.cyan(`${config.pm} run dev`));
  } else {
    console.log(pc.cyan(`${config.pm} dev`));
  }
  console.log(
    pc.bold('\nYou can now open the project and start writing documents'),
  );

  process.exit(0);
}

async function checkDir(outputDir: string) {
  const destDir = await fs.readdir(outputDir).catch(() => null);
  if (!destDir || destDir.length === 0) return;
  const del = await confirm({
    message: `directory ${outputDir} already exists, do you want to delete its files?`,
  });

  if (isCancel(del)) {
    cancel();
    process.exit(1);
  }

  if (!del) return;

  const info = spinner();
  info.start(`Deleting files in ${outputDir}`);

  await Promise.all(
    destDir.map((item) => {
      return fs.rm(path.join(outputDir, item), {
        recursive: true,
        force: true,
      });
    }),
  );

  info.stop(`Deleted files in ${outputDir}`);
}

main().catch((e: unknown) => {
  console.error(e);
  process.exit(1);
});
