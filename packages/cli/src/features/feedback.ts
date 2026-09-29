import path from 'node:path';
import type { Feature } from '@/features';
import { addImport, appendJsxChildren, findJsxElement } from '@/codemod';
import { docs } from './docs';
import { findSource } from './utils';

export const feedback: Feature = {
  id: 'feedback',
  title: 'Feedback',
  description: 'let readers rate docs pages, with a component to send feedback',
  requires: [docs],
  async apply(ctx) {
    const { cwd, baseDir, info, framework, static: isStatic } = ctx.project;
    await ctx.install('feedback');

    // server actions are only available on RSC frameworks, static export has none
    const serverAction = framework === 'next' || framework === 'waku';
    const page = await findSource(cwd, path.join(baseDir, info.routesDir), '<DocsPage');
    const edited =
      page !== undefined &&
      !(serverAction && isStatic) &&
      (await ctx.source(page, (file) => {
        if (file.code.includes('<Feedback')) return;
        const element = findJsxElement(file, 'DocsPage');
        if (!element) return;

        appendJsxChildren(
          file,
          element,
          `<Feedback
  onSendAction={async (feedback) => {${serverAction ? "\n    'use server';\n" : ''}
    console.log(feedback);
    return {};
  }}
/>`,
        );
        addImport(file, { from: '@/components/feedback/client', named: ['Feedback'] });
      }));

    if (!edited) {
      ctx.note(
        serverAction && isStatic
          ? 'Static export has no server actions, render `<Feedback />` from `@/components/feedback/client` in a client component and send the feedback to your API in `onSendAction`.'
          : 'Add `<Feedback />` from `@/components/feedback/client` to the bottom of your docs page.',
      );
    }
    ctx.note(
      'Handle the feedback in `onSendAction`, e.g. report it to GitHub Discussions: https://fumadocs.dev/docs/integrations/feedback.',
    );
  },
};
