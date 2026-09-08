import type { Feature } from '@/features';
import { scripts } from './utils';

const eslintConfig = `import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';

const eslintConfig = defineConfig([
  ...nextVitals,
  globalIgnores([
    '.next/**',
    'out/**',
    'build/**',
    'next-env.d.ts',
    '.source/**',
  ]),
]);

export default eslintConfig;
`;

const biomeConfig = (next: boolean) => ({
  $schema: 'https://biomejs.dev/schemas/2.2.0/schema.json',
  vcs: {
    enabled: true,
    clientKind: 'git',
    useIgnoreFile: true,
  },
  files: {
    ignoreUnknown: true,
    includes: next
      ? ['**', '!node_modules', '!.next', '!dist', '!build', '!.source']
      : ['**', '!node_modules', '!.source'],
  },
  formatter: {
    enabled: true,
    indentStyle: 'space',
    indentWidth: 2,
  },
  linter: {
    enabled: true,
    rules: {
      recommended: true,
    },
    domains: next ? { next: 'recommended', react: 'recommended' } : { react: 'recommended' },
  },
  assist: {
    actions: {
      source: {
        organizeImports: 'on',
      },
    },
  },
});

const oxlintConfig = (next: boolean, reactVersion: string) => ({
  $schema: './node_modules/oxlint/configuration_schema.json',
  plugins: next ? ['typescript', 'react', 'import', 'nextjs'] : ['typescript', 'react', 'import'],
  categories: {},
  env: {
    builtin: true,
  },
  settings: {
    react: {
      version: reactVersion,
    },
    tailwindcss: {
      callees: ['clsx', 'cva', 'cn'],
    },
  },
  ignorePatterns: ['node_modules/', 'dist/'],
});

export const lint: Feature<{ linter: 'eslint' | 'biome' | 'oxlint' }> = {
  id: 'lint',
  title: 'Linter',
  description: 'configure a linter',
  options: {
    linter: {
      message: 'Choose a linter',
      choices: [
        { value: 'eslint', label: 'ESLint', hint: 'Next.js only' },
        { value: 'biome', label: 'Biome' },
        { value: 'oxlint', label: 'Oxlint' },
      ],
    },
  },
  async apply(ctx, { linter }) {
    const { framework, packageJson } = ctx.project;
    const next = framework === 'next';
    const json = (content: object) => `${JSON.stringify(content, null, 2)}\n`;

    switch (linter) {
      case 'eslint':
        if (!next) throw new Error('ESLint is only supported on Next.js');
        ctx.addDependencies(
          { eslint: '^9.39.4', 'eslint-config-next': packageJson.dependencies?.next ?? null },
          true,
        );
        await ctx.write('eslint.config.mjs', eslintConfig);
        await ctx.packageJson((data) => scripts(data, { lint: 'eslint' }));
        break;
      case 'biome':
        ctx.addDependencies({ '@biomejs/biome': null }, true);
        await ctx.write('biome.json', json(biomeConfig(next)));
        await ctx.packageJson((data) =>
          scripts(data, { lint: 'biome check', format: 'biome format --write' }),
        );
        break;
      case 'oxlint': {
        const react = packageJson.dependencies?.react?.replace('^', '') ?? '19.2.0';
        ctx.addDependencies({ oxlint: null }, true);
        await ctx.write('.oxlintrc.json', json(oxlintConfig(next, react)));
        await ctx.packageJson((data) => scripts(data, { lint: 'oxlint' }));
        break;
      }
    }
  },
};
