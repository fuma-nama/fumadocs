import fs from 'node:fs/promises';
import path from 'node:path';
import packageJson from '../package.json';
import z from 'zod';
import {
  cancel,
  confirm,
  intro,
  isCancel,
  outro,
  select,
  spinner,
  text,
} from '@clack/prompts';
import pc from 'picocolors';
import { createCli, trpcServer, type TrpcCliMeta } from 'trpc-cli';
import { getPackageManager, type PackageManager } from './auto-install';
import { type Template, create } from './create-app';
import { cwd } from './constants';

const t = trpcServer.initTRPC.meta<TrpcCliMeta>().create();

const router = t.router({
  create: t.procedure
    .meta({
      default: true,
      description: 'Create a new documentation site with Fumadocs',
      examples: [
        'create-fumadocs-app',
        'create-fumadocs-app --name my-docs --template +next+fuma-docs-mdx',
        'create-fumadocs-app --name my-docs --no-install',
        'create-fumadocs-app --name my-docs --src --eslint',
      ],
      negateBooleans: true,
    })
    .input(
      z.object({
        name: z.string().optional().describe('Project name'),
        template: z
          .enum([
            '+next+fuma-docs-mdx',
            '+next+content-collections',
            'react-router',
            'tanstack-start',
          ])
          .optional()
          .describe('Choose a template'),
        src: z
          .boolean()
          .optional()
          .describe('Use /src directory (Next.js only)'),
        eslint: z
          .boolean()
          .optional()
          .describe('Add default ESLint configuration (Next.js only)'),
        install: z
          .boolean()
          .optional()
          .describe('Install packages automatically'),
        pm: z
          .enum(['npm', 'pnpm', 'yarn', 'bun'])
          .optional()
          .describe('Package manager to use'),
      }),
    )
    .mutation(async ({ input }) => {
      const manager = (input.pm as PackageManager) || getPackageManager();

      intro(pc.bgCyan(pc.bold('Create Fumadocs App')));

      const finalOptions = {
        name: input.name,
        template: input.template,
        src: input.src,
        eslint: input.eslint,
        install: input.install,
      };

      if (!finalOptions.name) {
        const nameResult = await text({
          message: 'Project name',
          placeholder: 'my-app',
          defaultValue: 'my-app',
        });

        if (isCancel(nameResult)) {
          cancel('Installation Stopped.');
          process.exit(0);
        }

        finalOptions.name = nameResult;
      }

      if (!finalOptions.template) {
        const templateResult = await select({
          message: 'Choose a template',
          initialValue: '+next+fuma-docs-mdx' as Template,
          options: [
            {
              value: '+next+fuma-docs-mdx',
              label: 'Next.js: Fumadocs MDX',
              hint: 'recommended',
            },
            {
              value: '+next+content-collections',
              label: 'Next.js: Content Collections',
            },
            {
              value: 'react-router',
              label: 'React Router: MDX Remote',
            },
            {
              value: 'tanstack-start',
              label: 'Tanstack Start: MDX Remote',
              hint: 'Experimental',
            },
          ],
        });

        if (isCancel(templateResult)) {
          cancel('Installation Stopped.');
          process.exit(0);
        }

        finalOptions.template = templateResult;
      }

      const isNext = finalOptions.template.startsWith('+next');

      if (isNext && finalOptions.src === undefined) {
        const srcResult = await confirm({
          message: 'Use `/src` directory?',
          initialValue: false,
        });

        if (isCancel(srcResult)) {
          cancel('Installation Stopped.');
          process.exit(0);
        }

        finalOptions.src = srcResult;
      }

      if (isNext && finalOptions.eslint === undefined) {
        const eslintResult = await confirm({
          message: 'Add default ESLint configuration?',
          initialValue: false,
        });

        if (isCancel(eslintResult)) {
          cancel('Installation Stopped.');
          process.exit(0);
        }

        finalOptions.eslint = eslintResult;
      }

      if (finalOptions.install === undefined) {
        const installResult = await confirm({
          message: `Do you want to install packages automatically? (detected as ${manager})`,
          initialValue: true,
        });

        if (isCancel(installResult)) {
          cancel('Installation Stopped.');
          process.exit(0);
        }

        finalOptions.install = installResult;
      }

      const projectName = finalOptions.name.toLowerCase().replace(/\s+/g, '-');
      const dest = path.resolve(cwd, projectName);

      const destDir = await fs.readdir(dest).catch(() => null);
      if (destDir && destDir.length > 0) {
        const del = await confirm({
          message: `directory ${projectName} already exists, do you want to delete its files?`,
          initialValue: false,
        });

        if (isCancel(del)) {
          cancel();
          return;
        }

        if (del) {
          const info = spinner();
          info.start(`Deleting files in ${projectName}`);

          await Promise.all(
            destDir.map((item) => {
              return fs.rm(path.join(dest, item), {
                recursive: true,
                force: true,
              });
            }),
          );

          info.stop(`Deleted files in ${projectName}`);
        }
      }

      const info = spinner();
      info.start(`Generating Project`);

      await create({
        packageManager: manager,
        tailwindcss: true,
        template: finalOptions.template,
        outputDir: dest,
        installDeps: finalOptions.install ?? true,
        eslint: finalOptions.eslint === true,
        useSrcDir: finalOptions.src === true,
        log: (message) => {
          info.message(message);
        },
      });

      info.stop('Project Generated');

      outro(pc.bgGreen(pc.bold('Done')));

      console.log(pc.bold('\nOpen the project'));
      console.log(pc.cyan(`cd ${projectName}`));

      console.log(pc.bold('\nRun Development Server'));
      console.log(pc.cyan('npm run dev | pnpm run dev | yarn dev'));

      console.log(
        pc.bold('\nYou can now open the project and start writing documents'),
      );

      return {
        projectName,
        template: finalOptions.template,
        success: true,
      };
    }),
});

const cli = createCli({
  router,
  name: 'create-fumadocs-app',
  version: packageJson.version,
  description: 'Create a new documentation site with Fumadocs',
});

cli.run();
