import { cancel, group, intro, select, confirm } from '@clack/prompts';
import picocolors from 'picocolors';
import { add, type Resolver } from '@/commands/add';
import type { Config } from '@/config';

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
              label: 'Start from the default one',
              value: 'full-default',
              hint: 'useful for adjusting small details.',
            },
            {
              label: 'Start from the Notebook layout',
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

  if (result.target === 'docs' && result.mode) {
    if (result.mode === 'minimal') {
      await add('layouts/docs-min', resolver, config);
    } else if (result.mode === 'full-default') {
      await add('layouts/docs', resolver, config);
    } else if (result.mode === 'full-notebook') {
      await add('layouts/notebook', resolver, config);
    }

    if (result.page) await add('layouts/page', resolver, config);
  }
}
