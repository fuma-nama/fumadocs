import {
  cancel,
  confirm,
  group,
  intro,
  log,
  outro,
  select,
} from '@clack/prompts';
import picocolors from 'picocolors';
import { type Resolver } from '@/utils/add/install-component';
import type { Config } from '@/config';
import { install } from '@/commands/add';

export async function customise(resolver: Resolver, config: Config) {
  intro(picocolors.bgBlack(picocolors.whiteBright('Customise Fumadocs UI')));

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
      page: async (v) => {
        if (v.results.target !== 'docs' || v.results.mode === 'minimal')
          return false;

        return confirm({
          message: 'Do you want to customise the page component too?',
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
    let pageAdded = false;
    if (result.mode === 'minimal') {
      targets.push('layouts/docs-min');
      pageAdded = true;
    } else {
      if (result.page) {
        targets.push('layouts/page');
        pageAdded = true;
      }

      targets.push(
        result.mode === 'full-default' ? 'layouts/docs' : 'layouts/notebook',
      );
    }

    await install(targets, resolver, config);

    intro(picocolors.bold('What is Next?'));
    log.info(
      [
        'You can check the installed components in `components/layouts`.',
        picocolors.dim('---'),
        'Open your `layout.tsx` files, replace the imports of components:',
        picocolors.greenBright(
          '`fumadocs-ui/layouts/docs` -> `@/components/layouts/docs`',
        ),
        pageAdded
          ? picocolors.greenBright(
              '`fumadocs-ui/page` -> `@/components/layouts/page`',
            )
          : '',
      ].join('\n'),
    );
  }

  if (result.target === 'home') {
    await install(['layouts/home'], resolver, config);
    intro(picocolors.bold('What is Next?'));

    log.info(
      [
        'You can check the installed components in `components/layouts`.',
        picocolors.dim('---'),
        'Open your `layout.tsx` files, replace the imports of components:',
        picocolors.greenBright(
          '`fumadocs-ui/layouts/home` -> `@/components/layouts/home`',
        ),
      ].join('\n'),
    );
  }

  outro(picocolors.bold('Have fun!'));
}
