import path from 'node:path';
import {
  type Component,
  type OutputComponent,
  type PackageJson,
  type Registry,
} from '@/build/build-registry';

export interface DependencyInfo {
  type: 'runtime' | 'dev';
  version?: string;
}

export type ComponentBuilder = ReturnType<typeof createComponentBuilder>;

/**
 * @param registry registry object
 * @param packageJson parsed package json object
 * @param registryDir directory of registry config file
 * @param sourceDir source directory of project (e.g. `/src`), used to resolve the output paths of component files
 */
export function createComponentBuilder(
  registry: Registry,
  packageJson: PackageJson | undefined,
  registryDir: string,
  sourceDir: string,
) {
  const fileToComponent = new Map<string, Component>();

  for (const comp of registry.components) {
    for (const file of comp.files) {
      const filePath = typeof file === 'string' ? file : file.in;

      if (fileToComponent.has(filePath))
        console.warn(
          `the same file ${file} exists in multiple component, you should make the shared file a separate component.`,
        );
      fileToComponent.set(filePath, comp);
    }
  }

  return {
    registryDir,
    registry,
    resolveDep(specifier: string): DependencyInfo & { name: string } {
      const name = specifier.startsWith('@')
        ? specifier.split('/').slice(0, 2).join('/')
        : specifier.split('/')[0];

      if (registry.dependencies && name in registry.dependencies)
        return {
          ...registry.dependencies[name],
          name,
        };

      if (packageJson && name in packageJson.devDependencies) {
        return {
          type: 'dev',
          version: packageJson.devDependencies[name],
          name,
        };
      }

      if (packageJson && name in packageJson.dependencies) {
        return {
          type: 'runtime',
          version: packageJson.dependencies[name],
          name,
        };
      }
      return { type: 'runtime', name };
    },
    getComponentByName(
      name: string,
      registryName?: string,
    ): Component | OutputComponent | undefined {
      const components = registryName
        ? registry.on![registryName].registry.components
        : registry.components;

      for (const comp of components) {
        if (comp.name === name) return comp;
      }
    },
    resolveOutputPath(file: string, forcedNamespace?: string): string {
      const relativeFile = path.relative(registryDir, file);

      if (forcedNamespace) {
        return `${forcedNamespace}:${path.relative(sourceDir, file)}`;
      }

      if (registry.namespaces)
        for (const namespace of Object.keys(registry.namespaces)) {
          const relativePath = path.relative(namespace, relativeFile);

          if (
            !relativePath.startsWith('../') &&
            !path.isAbsolute(relativePath)
          ) {
            return `${registry.namespaces[namespace]}:${relativePath}`;
          }
        }

      return path.relative(sourceDir, file);
    },
    getSubComponent(file: string): Component | undefined {
      const relativeFile = path.relative(registryDir, file);
      const comp = fileToComponent.get(relativeFile);

      if (!comp) return;
      return comp;
    },
  };
}
