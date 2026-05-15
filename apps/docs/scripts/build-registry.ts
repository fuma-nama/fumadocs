import { compileOptions, registry } from '../components/registry/index.ts';
import { compile, writeRegistry } from 'fuma-cli/compiler';

export async function buildRegistry() {
  const all = await compile({
    root: registry,
    ...compileOptions,
  });
  await writeRegistry(all, {
    dir: 'public/registry',
  });
}
