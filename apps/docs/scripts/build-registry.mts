import { build, writeOutput } from 'fumadocs/build';
import { registry } from '@/components/registry.mjs';

void build(registry).then(async (out) => {
  await writeOutput('public/registry', out, {
    cleanDir: true,
  });
});
