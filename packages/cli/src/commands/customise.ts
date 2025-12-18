import { cancel, group, intro, log, outro, select } from '@clack/prompts';
import picocolors from 'picocolors';
import { install } from '@/commands/add';
import type { RegistryClient } from '@/registry/client';
import { ComponentInstaller } from '@/registry/installer';
import { UIRegistries } from '@/commands/shared';

export async function customise(client: RegistryClient) {
  intro(picocolors.bgBlack(picocolors.whiteBright('Customise Fumadocs UI')));
  const config = client.config;
  const installer = new ComponentInstaller(client);

  const result = await group(
    {
      target: () =>
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
      mode: (v) => {
        if (v.results.target !== 'docs') return;

        return select({
          message: 'Which variant do you want to start from?',
          options: [
            {
              label: 'Start from minimal styles',
              value: 'minimal',
              hint: 'for those who want to build their own variant from ground up.',
            },
            {
              label: 'Start from default layout',
              value: 'full-default',
              hint: 'useful for adjusting small details.',
            },
            {
              label: 'Start from Notebook layout',
              value: 'full-notebook',
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

  if (result.target === 'docs') {
    const targets = [];
    if (result.mode === 'minimal') {
      targets.push('fumadocs/ui/layouts/docs-min');
    } else {
      const registry = UIRegistries[config.uiLibrary];

      targets.push(
        result.mode === 'full-default'
          ? `${registry}/layouts/docs`
          : `${registry}/layouts/notebook`,
      );
    }

    await install(targets, installer);
    const maps: [string, string][] =
      result.mode === 'full-notebook'
        ? [
            ['fumadocs-ui/layouts/notebook', '@/components/layout/notebook'],
            [
              'fumadocs-ui/layouts/notebook/page',
              '@/components/layout/notebook/page',
            ],
          ]
        : [
            ['fumadocs-ui/layouts/docs', '@/components/layout/docs'],
            ['fumadocs-ui/layouts/docs/page', '@/components/layout/docs/page'],
          ];

    printNext(...maps);
  }

  if (result.target === 'home') {
    await install(['layouts/home'], installer);
    printNext(['fumadocs-ui/layouts/home', `@/components/layout/home`]);
  }

  outro(picocolors.bold('Have fun!'));
}

function printNext(...maps: [from: string, to: string][]) {
  intro(picocolors.bold('What is Next?'));

  log.info(
    [
      'You can check the installed components in `components`.',
      picocolors.dim('---'),
      'Open your `layout.tsx` files, replace the imports of components:',
      ...maps.map(([from, to]) =>
        picocolors.greenBright(`"${from}" -> "${to}"`),
      ),
    ].join('\n'),
  );
}
