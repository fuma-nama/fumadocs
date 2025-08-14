import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { buildFile, Reference, SourceReference } from '@/build/build-file';
import {
  type ComponentBuilder,
  createComponentBuilder,
} from './component-builder';
import type { Registry as ShadcnRegistry } from 'shadcn/registry';
import { componentToShadcn } from '@/build/shadcn';
import { validateOutput } from '@/build/validate';

export type OnResolve = (reference: SourceReference) => Reference;

export interface ComponentFile {
  type: NamespaceType;
  path: string;
  target?: string;
}

export interface Component {
  name: string;
  title?: string;
  description?: string;
  files: ComponentFile[];

  /**
   * Don't list the component in registry index file
   */
  unlisted?: boolean;

  /**
   * Map imported file paths, inherit from registry if not defined.
   */
  onResolve?: OnResolve;
}

export type NamespaceType =
  | 'components'
  | 'lib'
  | 'css'
  | 'route'
  | 'ui'
  | 'block';

export interface PackageJson {
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
}

export interface Registry {
  name: string;
  homepage: string;
  packageJson: string | PackageJson;
  tsconfigPath: string;
  components: Component[];

  /**
   * The directory of registry, used to resolve relative paths
   */
  dir: string;

  /**
   * Map import paths of components
   */
  onResolve?: OnResolve;
  /**
   * When a referenced file is not found in component files, this function is called.
   */
  onUnknownFile?: (absolutePath: string) => ComponentFile | undefined;

  dependencies?: Record<string, string | null>;
  devDependencies?: Record<string, string | null>;
}

export interface Output {
  index: OutputIndex[];
  components: OutputComponent[];

  shadcn: ShadcnRegistry;
}

export interface OutputIndex {
  name: string;
  description?: string;
}

export interface OutputFile {
  type: NamespaceType;
  path: string;
  target?: string;
  content: string;
}

export interface OutputComponent {
  name: string;
  title?: string;
  description?: string;

  files: OutputFile[];

  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
  subComponents: string[];
}

export async function build(registry: Registry): Promise<Output> {
  const output: Output = {
    index: [],
    components: [],
    shadcn: {
      name: registry.name,
      items: [],
      homepage: registry.homepage,
    },
  };

  function readPackageJson() {
    if (typeof registry.packageJson !== 'string') return registry.packageJson;

    return fs
      .readFile(path.join(registry.dir, registry.packageJson))
      .then((res) => JSON.parse(res.toString()) as PackageJson)
      .catch(() => undefined);
  }

  const packageJson = await readPackageJson();
  const builder = createComponentBuilder(registry, packageJson);

  const builtComps = await Promise.all(
    registry.components.map((component) => buildComponent(component, builder)),
  );
  for (const [input, comp] of builtComps) {
    if (!input.unlisted) {
      output.index.push({
        name: input.name,
        description: input.description,
      });
    }

    output.shadcn.items.push(componentToShadcn(comp, registry));
    output.components.push(comp);
  }

  validateOutput(output);
  return output;
}

async function buildComponent(component: Component, builder: ComponentBuilder) {
  const processedFiles = new Set<string>();
  const subComponents = new Set<string>();
  const devDependencies = new Map<string, string>();
  const dependencies = new Map<string, string>();

  function toImportPath(file: ComponentFile): string {
    let filePath = file.path;
    for (const ext of ['.ts', '.tsx']) {
      if (!filePath.endsWith(ext)) continue;

      filePath = filePath.substring(0, filePath.length - ext.length);
      break;
    }

    if (filePath.startsWith('./')) filePath = filePath.slice(2);

    return `@/${filePath.replaceAll(path.sep, '/')}`;
  }

  async function build(file: ComponentFile): Promise<OutputFile[]> {
    if (processedFiles.has(file.path)) return [];
    processedFiles.add(file.path);

    const queue: ComponentFile[] = [];
    const result = await buildFile(file, builder, component, (reference) => {
      if (reference.type === 'custom') return reference.specifier;

      if (reference.type === 'file') {
        const refFile = builder.registry.onUnknownFile?.(reference.file);
        if (refFile) {
          queue.push(refFile);
          return toImportPath(refFile);
        }

        throw new Error(
          `Unknown file ${reference.file} referenced by ${file.path}`,
        );
      }

      if (reference.type === 'sub-component') {
        const resolved = reference.resolved;
        if (resolved.component.name !== component.name)
          subComponents.add(resolved.component.name);

        return toImportPath(resolved.file);
      }

      const dep = builder.getDepInfo(reference.dep);
      if (dep) {
        const map = dep.type === 'dev' ? devDependencies : dependencies;
        map.set(dep.name, dep.version ?? '');
      }
      return reference.specifier;
    });

    return [result, ...(await Promise.all(queue.map(build))).flat()];
  }

  return [
    component,
    {
      name: component.name,
      title: component.title,
      description: component.description,
      files: (await Promise.all(component.files.map(build))).flat(),
      subComponents: Array.from(subComponents),
      dependencies: Object.fromEntries(dependencies),
      devDependencies: Object.fromEntries(devDependencies),
    },
  ] as [Component, OutputComponent];
}
