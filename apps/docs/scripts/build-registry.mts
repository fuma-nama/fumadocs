import { build, writeOutput } from 'fumadocs/build';
import { registry } from '@/components/registry';

void build(registry).then(async (out) => {
  await writeOutput('public/registry', out);
  console.log('done');
});
