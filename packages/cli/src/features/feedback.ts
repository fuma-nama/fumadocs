import fs from 'node:fs/promises';
import path from 'node:path';
import type { Feature, FeatureContext } from '@/features';
import { addImport, appendJsxChildren, findJsxElement } from '@/codemod';
import { docs } from './docs';
import { astroModule, findSource, requiresManaged } from './utils';

/** Astro Actions are the server functions of Astro, they validate the feedback with its schema */
const astroActions = `import { defineAction } from 'astro:actions';
import { pageFeedback, type ActionResponse } from '@/components/feedback/schema';

export const server = {
  pageFeedback: defineAction({
    input: pageFeedback,
    async handler(feedback): Promise<ActionResponse> {
      console.log(feedback);
      return {};
    },
  }),
};
`;

/** the action of page feedback in `src/actions/index.ts`, `false` when the file has other actions */
async function addAstroAction(ctx: FeatureContext) {
  const file = path.join(ctx.project.baseDir, 'actions/index.ts');
  const current = await fs.readFile(path.join(ctx.project.cwd, file), 'utf-8').catch(() => null);
  if (current === null) {
    await ctx.write(file, astroActions);
    return true;
  }
  return current.includes('pageFeedback');
}

export const feedback: Feature = {
  id: 'feedback',
  title: 'Feedback',
  description: 'let readers rate docs pages, with a component to send feedback',
  requires: [docs],
  supports: requiresManaged,
  async apply(ctx) {
    const { cwd, baseDir, info, framework, static: isStatic } = ctx.project;
    await ctx.install('feedback');

    // server actions are only available on RSC frameworks, static export has none
    const serverAction = framework === 'next' || framework === 'waku';
    // Astro Actions need an adapter
    const astroAction = framework === 'astro' && !isStatic;
    if (astroAction && !(await addAstroAction(ctx)))
      ctx.note(
        'Add a `pageFeedback` action to `server` in `src/actions/index.ts`, with `defineAction({ input: pageFeedback, handler })`.',
      );

    // Astro renders docs pages with the `page` module of the Fumadocs integration
    const page =
      framework === 'astro'
        ? await astroModule(ctx, 'page')
        : await findSource(cwd, path.join(baseDir, info.routesDir), '<DocsPage');
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
          astroAction
            ? '<Feedback onSendAction={actions.pageFeedback.orThrow} />'
            : `<Feedback
  onSendAction={async (feedback) => {${serverAction ? "\n    'use server';\n" : ''}
    console.log(feedback);
    return {};
  }}
/>`,
        );
        addImport(file, { from: '@/components/feedback/client', named: ['Feedback'] });
        if (astroAction) addImport(file, { from: 'astro:actions', named: ['actions'] });
      }));

    if (!edited) {
      ctx.note(
        serverAction && isStatic
          ? 'Static export has no server actions, render `<Feedback />` from `@/components/feedback/client` in a client component and send the feedback to your API in `onSendAction`.'
          : 'Add `<Feedback />` from `@/components/feedback/client` to the bottom of your docs page.',
      );
    }
    if (framework === 'astro' && isStatic)
      ctx.note(
        'Feedback is sent from the browser in `onSendAction`, add an adapter to handle it on your server with an Astro Action: https://fumadocs.dev/docs/astro/feedback.',
      );
    ctx.note(
      astroAction
        ? 'Handle the feedback in the `pageFeedback` action of `src/actions/index.ts`, e.g. report it to GitHub Discussions: https://fumadocs.dev/docs/integrations/feedback.'
        : 'Handle the feedback in `onSendAction`, e.g. report it to GitHub Discussions: https://fumadocs.dev/docs/integrations/feedback.',
    );
  },
};
