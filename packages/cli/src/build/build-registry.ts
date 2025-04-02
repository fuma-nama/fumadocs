import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { buildFile } from '@/build/build-file';
import {
  type ComponentBuilder,
  createComponentBuilder,
} from './component-builder';

export interface Component {
  name: string;
  description?: string;
  files: (
    | string
    | {
        in: string;
        out: string;
      }
  )[];

  /**
   * Don't list the component in registry index file
   */
  unlisted?: boolean;

  /**
   * Map imported file paths
   */
  mapImportPath?: Record<
    string,
    | string
    | {
        type: 'component';
        name: string;
        file: string;

        /**
         * Registry of the component, refer to the current registry if not specified
         */
        registry?: string;
      }
  >;
}

export type NamespaceType = 'components' | 'hooks' | 'lib';

export interface PackageJson {
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
}

export interface Registry {
  /**
   * The directory of registry, needed to resolve relative paths
   */
  dir: string;

  /**
   * Extend on existing registry
   */
  on?: Record<
    string,
    { type: 'remote'; registry: Output } | { type: 'local'; registry: Registry }
  >;

  /**
   * The root directory project, used to resolve config paths
   */
  rootDir: string;

  namespaces?: Record<string, NamespaceType>;
  tsconfigPath?: string;
  packageJson?: string | PackageJson;

  components: Component[];
  dependencies?: Record<
    string,
    {
      type: 'runtime' | 'dev';
      version?: string;
    }
  >;
}

export interface Output {
  index: OutputIndex[];
  components: OutputComponent[];
}

export interface OutputIndex {
  name: string;
  description?: string;
}

export interface OutputFile {
  path: string;
  content: string;
  /**
   * Import reference path - path in `files`
   */
  imports: Record<string, string>;
}

export interface OutputComponent {
  name: string;

  files: OutputFile[];

  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
  subComponents: string[];
}

export async function build(registry: Registry): Promise<Output> {
  const output: Output = {
    index: [],
    components: [],
  };

  function readPackageJson() {
    if (typeof registry.packageJson !== 'string' && registry.packageJson)
      return registry.packageJson;

    return fs
      .readFile(
        registry.packageJson
          ? path.join(registry.dir, registry.packageJson)
          : path.join(registry.dir, registry.rootDir, 'package.json'),
      )
      .then((res) => JSON.parse(res.toString()) as PackageJson)
      .catch(() => undefined);
  }

  const packageJson = await readPackageJson();
  const builder = createComponentBuilder(registry, packageJson);

  const buildExtendRegistries = Object.values(registry.on ?? {}).map(
    async (schema) => {
      if (schema.type === 'remote') {
        return schema.registry;
      }

      return await build(schema.registry);
    },
  );

  for (const built of await Promise.all(buildExtendRegistries)) {
    output.components.push(...built.components);
    output.index.push(...built.index);
  }

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

    output.components.push(comp);
  }

  return output;
}

async function buildComponent(component: Component, builder: ComponentBuilder) {
  const processedFiles = new Set<string>();
  const subComponents = new Set<string>();
  const devDependencies = new Map<string, string>();
  const dependencies = new Map<string, string>();

  async function build(
    file: string | { in: string; out: string },
  ): Promise<OutputFile[]> {
    let inputPath;
    let outputPath;

    if (typeof file === 'string') {
      let namespace;
      const parsed = file.split(':', 2);
      if (parsed.length > 1) {
        namespace = parsed[0];
        inputPath = path.join(builder.registryDir, parsed[1]);
      } else {
        inputPath = path.join(builder.registryDir, file);
      }

      outputPath = builder.resolveOutputPath(file, undefined, namespace);
    } else {
      inputPath = path.join(builder.registryDir, file.in);
      outputPath = file.out;
    }

    if (processedFiles.has(inputPath)) return [];
    processedFiles.add(inputPath);

    const queue: string[] = [];

    const result = await buildFile(
      inputPath,
      outputPath,
      builder,
      component,
      (reference) => {
        if (reference.type === 'file') {
          queue.push(path.relative(builder.registryDir, reference.file));
          return builder.resolveOutputPath(reference.file);
        }

        if (reference.type === 'sub-component') {
          const resolved = reference.resolved;
          subComponents.add(resolved.component.name);

          if (resolved.type === 'remote') {
            return reference.targetFile;
          }

          for (const childFile of resolved.component.files) {
            if (
              typeof childFile === 'string' &&
              childFile === reference.targetFile
            ) {
              return builder.resolveOutputPath(
                childFile,
                reference.resolved.registryName,
              );
            }

            if (
              typeof childFile === 'object' &&
              childFile.in === reference.targetFile
            ) {
              return childFile.out;
            }
          }

          throw new Error(
            `Failed to find sub component ${resolved.component.name}'s ${reference.targetFile} referenced by ${inputPath}`,
          );
        }

        if (reference.type === 'dependency') {
          if (reference.isDev)
            devDependencies.set(reference.name, reference.version);
          else dependencies.set(reference.name, reference.version);
        }
      },
    );

    return [result, ...(await Promise.all(queue.map(build))).flat()];
  }

  return [
    component,
    {
      name: component.name,
      files: (await Promise.all(component.files.map(build))).flat(),
      subComponents: Array.from(subComponents),
      dependencies: Object.fromEntries(dependencies),
      devDependencies: Object.fromEntries(devDependencies),
    },
  ] as [Component, OutputComponent];
}
