import { fileURLToPath } from 'node:url';
import type {
  Registry,
  Reference,
  SourceReference,
  Component,
  ComponentFile,
} from '@fumadocs/cli/build';
import * as path from 'node:path';
import { Glob } from 'bun';

const srcDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '../');

// import specifier -> sub component & file
const installables: Record<
  string,
  {
    comp: Component;
    file: ComponentFile;
  }
> = {};

const contextFiles = new Set(
  new Glob('*').scanSync({ cwd: path.join(srcDir, 'contexts') }),
);
const hookFiles = new Set(
  new Glob('*').scanSync({ cwd: path.join(srcDir, 'hooks') }),
);
const componentFiles = new Set(
  new Glob('**/*').scanSync({ cwd: path.join(srcDir, 'components') }),
);

export function resolveForwardedAPIs(
  ref: SourceReference,
  upstreamPackage: string,
  upstreamRegistry: Registry,
): Reference | undefined {
  if (ref.type === 'dependency' && ref.dep === '@fumadocs/ui') {
    const specifier = ref.specifier;

    if (specifier === '@fumadocs/ui/icons') {
      return {
        type: 'dependency',
        dep: 'lucide-react',
        specifier: 'lucide-react',
      };
    }

    if (specifier in installables) {
      const { comp, file } = installables[specifier];
      return {
        type: 'sub-component',
        resolved: {
          type: 'remote',
          registryName: registry.name,
          component: comp,
          file,
        },
      };
    }

    return {
      type: 'dependency',
      dep: upstreamPackage,
      specifier: specifier
        .replace('@fumadocs/ui/hooks', `${upstreamPackage}/utils`)
        .replace('@fumadocs/ui', upstreamPackage),
    };
  }

  if (ref.type === 'file') {
    const filePath = path
      .relative(upstreamRegistry.dir, ref.file)
      .replaceAll('\\', '/');

    let hasForwarding: boolean;
    const [dir, rest] = splitDir(filePath);
    switch (dir) {
      case 'contexts':
        hasForwarding = contextFiles.has(rest);
        break;
      case 'components':
        hasForwarding = componentFiles.has(rest);
        break;
      case 'utils':
        hasForwarding = hookFiles.has(rest);
        break;
      default:
        hasForwarding = filePath === 'i18n.tsx';
    }

    if (hasForwarding)
      return resolveForwardedAPIs(
        {
          type: 'dependency',
          dep: '@fumadocs/ui',
          specifier: `@fumadocs/ui/${filePath.slice(0, -path.extname(filePath).length)}`,
        },
        upstreamPackage,
        upstreamRegistry,
      );
  }
}

export const registry: Registry = {
  name: 'fumadocs/ui',
  dir: srcDir,
  tsconfigPath: '../tsconfig.json',
  packageJson: '../package.json',
  onResolve(ref) {
    if (ref.type !== 'file') return ref;
    const filePath = path
      .relative(registry.dir, ref.file)
      .replaceAll('\\', '/');

    if (filePath === 'icons.tsx')
      return {
        type: 'dependency',
        dep: 'lucide-react',
        specifier: 'lucide-react',
      };

    const [dir, rest] = splitDir(filePath);
    switch (dir) {
      case 'contexts':
        return {
          type: 'custom',
          specifier: `<ui>/${dir}/${rest.slice(0, -path.extname(rest).length)}`,
        };
    }

    return ref;
  },
  components: [
    {
      name: 'layouts/docs-min',
      description: 'Replace Docs Layout (Minimal)',
      files: [
        {
          type: 'block',
          path: '_registry/layout/docs-min.tsx',
          target: 'components/layout/docs/index.tsx',
        },
        {
          type: 'block',
          path: '_registry/layout/page-min.tsx',
          target: 'components/layout/docs/page.tsx',
        },
      ],
      unlisted: true,
    },
    {
      name: 'urls',
      unlisted: true,
      files: [
        {
          type: 'lib',
          path: 'urls.ts',
        },
      ],
    },
    {
      name: 'cn',
      unlisted: true,
      files: [
        {
          type: 'lib',
          path: 'cn.ts',
        },
      ],
    },
    {
      name: 'merge-refs',
      unlisted: true,
      files: [
        {
          type: 'lib',
          path: 'merge-refs.ts',
        },
      ],
    },
    {
      name: 'link-item',
      unlisted: true,
      files: [
        {
          type: 'components',
          path: 'link-item.tsx',
          target: '<dir>/layout/link-item.tsx',
        },
      ],
    },
    {
      name: 'toc',
      unlisted: true,
      files: [
        {
          type: 'components',
          path: 'components/toc/clerk.tsx',
          target: '<dir>/toc/clerk.tsx',
        },
        {
          type: 'components',
          path: 'components/toc/default.tsx',
          target: '<dir>/toc/default.tsx',
        },
        {
          type: 'components',
          path: 'components/toc/index.tsx',
          target: '<dir>/toc/index.tsx',
        },
      ],
    },
  ],
  dependencies: {
    'fumadocs-core': null,
    react: null,
  },
};

function splitDir(filePath: string): [dir: string, rest: string] {
  const idx = filePath.indexOf('/');
  if (idx === -1) {
    return ['', filePath];
  } else {
    return [filePath.substring(0, idx), filePath.substring(idx + 1)];
  }
}

for (const comp of registry.components) {
  for (const file of comp.files) {
    const importPath = file.path.slice(0, -path.extname(file.path).length);
    installables[`@fumadocs/ui/${importPath}`] = {
      comp,
      file,
    };
  }
}
