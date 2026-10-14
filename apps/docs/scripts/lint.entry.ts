import { registerHooks } from 'node:module';
import { postInstall } from 'fumadocs-mdx/next';
import mdx from 'fumadocs-mdx/rolldown';
import { unrun } from 'unrun';

// assets imported by components in MDX aren't used by the lint
registerHooks({
  load: (url, context, nextLoad) =>
    url.endsWith('.css')
      ? { format: 'module', source: '', shortCircuit: true }
      : nextLoad(url, context),
});

process.env.LINT = '1';
await postInstall();
await unrun({
  path: './scripts/lint.ts',
  inputOptions: {
    plugins: [mdx(await import('../source.config.ts'))],
    moduleTypes: { '.png': 'binary', '.jpg': 'binary', '.jpeg': 'binary', '.webp': 'binary' },
  },
});
