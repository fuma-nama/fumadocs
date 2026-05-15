import { postInstall } from 'fumadocs-mdx/next';
import mdx from 'fumadocs-mdx/rolldown';
import { unrun } from 'unrun';

process.env.LINT = '1';
await postInstall();
await unrun({
  path: './scripts/lint.ts',
  inputOptions: {
    plugins: [mdx(await import('../source.config.ts'))],
  },
});
