import path from 'node:path';
import {
  type Component,
  type OutputComponent,
  type PackageJson,
  type Registry,
} from '@/build/build-registry';
import { Project } from 'ts-morph';
import * as fs from 'fs/promises';

export interface DependencyInfo {
  type: 'runtime' | 'dev';
  version?: string;
}

type GetComponentResult =
  | {
      type: 'local';
      registryName?: string;
      component: Component;
    }
  | {
      type: 'remote';
      registryName: string;
      component: OutputComponent;
    };
export type ComponentBuilder = ReturnType<typeof createComponentBuilder>;

/**
 * @param registry registry object
 * @param packageJson parsed package json object
 */
export function createComponentBuilder(
  registry: Registry,
  packageJson: PackageJson | undefined,
) {
  const rootDir = path.join(registry.dir, registry.rootDir);
  const project = new Project({
    tsConfigFilePath: registry.tsconfigPath
      ? path.join(rootDir, registry.tsconfigPath)
      : path.join(rootDir, 'tsconfig.json'),
  });
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
    registryDir: registry.dir,
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
    async createSourceFile(file: string) {
      const content = await fs.readFile(file);

      return project.createSourceFile(file, content.toString(), {
        overwrite: true,
      });
    },
    getComponentByName(
      name: string,
      registryName?: string,
    ): GetComponentResult | undefined {
      if (registryName) {
        const child = registry.on![registryName];
        const comp = child.registry.components.find(
          (comp) => comp.name === name,
        );

        if (comp) {
          return {
            type: child.type,
            registryName,
            component: comp,
          } as GetComponentResult;
        }

        return;
      }

      const comp = registry.components.find((comp) => comp.name === name);

      if (comp) {
        return {
          type: 'local',
          registryName,
          component: comp,
        };
      }
    },
    resolveOutputPath(
      file: string,
      registryName?: string,
      namespace?: string,
    ): string {
      let targetRegistry = registry;
      if (registryName && registry.on![registryName].type === 'local') {
        targetRegistry = registry.on![registryName].registry;
      }

      const parsed = file.split(':', 2);
      if (parsed.length > 1) {
        namespace ??= parsed[0];
        file = parsed[1];
      }

      if (!path.isAbsolute(file)) {
        file = path.join(targetRegistry.dir, file);
      }

      const rootDir = path.join(targetRegistry.dir, targetRegistry.rootDir);
      if (namespace) {
        return `${namespace}:${path.relative(rootDir, file)}`;
      }

      if (targetRegistry.namespaces)
        for (const namespace in targetRegistry.namespaces) {
          const relativePath = path.relative(
            path.join(targetRegistry.dir, namespace),
            file,
          );

          if (!relativePath.startsWith('../')) {
            return `${targetRegistry.namespaces[namespace]}:${relativePath}`;
          }
        }

      return path.relative(rootDir, file);
    },
    getSubComponent(file: string): Component | undefined {
      const relativeFile = path.relative(registry.dir, file);
      const comp = fileToComponent.get(relativeFile);

      if (!comp) return;
      return comp;
    },
  };
}
