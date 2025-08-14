import path from 'node:path';
import {
  type Component,
  type ComponentFile,
  type PackageJson,
  type Registry,
} from '@/build/build-registry';
import { Project } from 'ts-morph';
import * as fs from 'fs/promises';

export type ComponentBuilder = ReturnType<typeof createComponentBuilder>;

/**
 * @param registry registry object
 * @param packageJson parsed package json object
 */
export function createComponentBuilder(
  registry: Registry,
  packageJson: PackageJson | undefined,
) {
  const project = new Project({
    tsConfigFilePath: path.join(registry.dir, registry.tsconfigPath),
  });
  const fileToComponent = new Map<string, [Component, ComponentFile]>();

  for (const comp of registry.components) {
    for (const file of comp.files) {
      if (fileToComponent.has(file.path))
        console.warn(
          `the same file ${file.path} exists in multiple component, you should make the shared file a separate component.`,
        );
      fileToComponent.set(file.path, [comp, file]);
    }
  }

  return {
    registryDir: registry.dir,
    registry,
    getDepFromSpecifier(specifier: string) {
      return specifier.startsWith('@')
        ? specifier.split('/').slice(0, 2).join('/')
        : specifier.split('/')[0];
    },
    getDepInfo(name: string):
      | {
          type: 'runtime' | 'dev';
          name: string;
          version: string | null;
        }
      | undefined {
      if (registry.dependencies && name in registry.dependencies)
        return {
          name,
          type: 'runtime',
          version: registry.dependencies[name],
        };

      if (registry.devDependencies && name in registry.devDependencies)
        return {
          name,
          type: 'dev',
          version: registry.devDependencies[name],
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
    },
    async createSourceFile(file: string) {
      const content = await fs.readFile(file);

      return project.createSourceFile(file, content.toString(), {
        overwrite: true,
      });
    },
    getComponentByName(name: string): Component | undefined {
      return registry.components.find((comp) => comp.name === name);
    },
    getSubComponent(file: string) {
      const relativeFile = path.relative(registry.dir, file);
      const comp = fileToComponent.get(relativeFile);

      if (!comp) return;
      return {
        component: comp[0],
        file: comp[1],
      };
    },
  };
}
