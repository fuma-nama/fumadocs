import { cancel, group, intro, log, outro, select } from '@clack/prompts';
import picocolors from 'picocolors';
import { install } from '@/commands/add';
import type { RegistryClient } from '@/registry/client';
import { ComponentInstaller } from '@/registry/installer';
import { UIRegistries } from '@/commands/shared';

interface TargetInfo {
  target: string[];
  replace: [string, string][];
}

export async function customise(client: RegistryClient) {
  intro(picocolors.bgBlack(picocolors.whiteBright('Customise Fumadocs UI')));
  const config = client.config;
  const installer = new ComponentInstaller(client);
  const registry = UIRegistries[config.uiLibrary];

  const result = await group(
    {
      layout: () =>
        select({
          message: 'What do you want to customise?',
          options: [
            {
              label: 'Docs Layout',
              value: 'docs',
              hint: 'main UI of your docs',
            },
            {
              label: 'Home Layout',
              value: 'home',
              hint: 'the navbar for your other pages',
            },
          ],
        }),
      target: (v): Promise<TargetInfo | symbol> => {
        if (v.results.layout !== 'docs')
          return Promise.resolve({
            target: [`${registry}/layouts/home`],
            replace: [['fumadocs-ui/layouts/home', `@/components/layout/home`]],
          });

        return select<TargetInfo>({
          message: 'Which variant do you want to start from?',
          options: [
            {
              label: 'Start from minimal styles',
              hint: 'for those who want to build their own variant from ground up.',
              value: {
                target: ['fumadocs/ui/layouts/docs-min'],
                replace: [
                  ['fumadocs-ui/layouts/docs', '@/components/layout/docs'],
                  ['fumadocs-ui/layouts/docs/page', '@/components/layout/docs/page'],
                ],
              },
            },
            {
              label: 'Start from default layout',
              value: {
                target: [`${registry}/layouts/docs`],
                replace: [
                  ['fumadocs-ui/layouts/docs', '@/components/layout/docs'],
                  ['fumadocs-ui/layouts/docs/page', '@/components/layout/docs/page'],
                ],
              },
              hint: 'useful for adjusting small details.',
            },
            {
              label: 'Start from Notebook layout',
              value: {
                target: [`${registry}/layouts/notebook`],
                replace: [
                  ['fumadocs-ui/layouts/notebook', '@/components/layout/notebook'],
                  ['fumadocs-ui/layouts/notebook/page', '@/components/layout/notebook/page'],
                ],
              },
              hint: 'useful for adjusting small details.',
            },
            {
              label: 'Start from Flux layout',
              value: {
                target: [`${registry}/layouts/flux`],
                replace: [
                  ['fumadocs-ui/layouts/flux', '@/components/layout/flux'],
                  ['fumadocs-ui/layouts/flux/page', '@/components/layout/flux/page'],
                ],
              },
              hint: 'useful for adjusting small details.',
            },
          ],
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

  const target = result.target as TargetInfo;
  await install(target.target, installer);
  printNext(...target.replace);

  outro(picocolors.bold('Have fun!'));
}

function printNext(...maps: [from: string, to: string][]) {
  intro(picocolors.bold('What is Next?'));

  log.info(
    [
      'You can check the installed components in `components`.',
      picocolors.dim('---'),
      'Open your `layout.tsx` files, replace the imports of components:',
      ...maps.map(([from, to]) => picocolors.greenBright(`"${from}" -> "${to}"`)),
    ].join('\n'),
  );
}
