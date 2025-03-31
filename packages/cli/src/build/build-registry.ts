import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { Project } from 'ts-morph';
import { buildFile } from '@/build/build-file';
import { ComponentBuilder, createComponentBuilder } from './component-builder';
import { getFileNamespace } from '@/build/get-path-namespace';
import { exists } from '@/utils/fs';

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
        registry: string;
        name: string;
        file: string;
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
   * The path of registry, needed to resolve relative paths
   */
  path: string;

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
  const registryDir = path.dirname(registry.path);
  const rootDir = path.join(registryDir, registry.rootDir);
  const useSrc = await exists(path.join(rootDir, 'src'));
  const output: Output = {
    index: [],
    components: [],
  };

  const project = new Project({
    tsConfigFilePath: registry.tsconfigPath
      ? path.join(registryDir, registry.tsconfigPath)
      : path.join(rootDir, 'tsconfig.json'),
  });

  function readPackageJson() {
    if (typeof registry.packageJson !== 'string' && registry.packageJson)
      return registry.packageJson;

    return fs
      .readFile(
        registry.packageJson
          ? path.join(registryDir, registry.packageJson)
          : path.join(rootDir, 'package.json'),
      )
      .then((res) => JSON.parse(res.toString()) as PackageJson)
      .catch(() => undefined);
  }

  const packageJson = await readPackageJson();
  const builder = createComponentBuilder(
    registry,
    packageJson,
    registryDir,
    useSrc ? path.join(rootDir, 'src') : rootDir,
  );

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
    registry.components.map((component) =>
      buildComponent(component, builder, registryDir, project),
    ),
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

async function buildComponent(
  component: Component,
  builder: ComponentBuilder,
  registryDir: string,
  project: Project,
) {
  const processedFiles = new Set<string>();
  const subComponents = new Set<string>();
  const devDependencies = new Map<string, string>();
  const dependencies = new Map<string, string>();
  const files: OutputFile[] = [];

  async function build(file: string | { in: string; out: string }) {
    const inFile = typeof file === 'string' ? file : file.in;

    if (processedFiles.has(inFile)) return;
    processedFiles.add(inFile);

    const parsed = getFileNamespace(inFile);
    parsed.path = path.join(registryDir, parsed.path);

    const content = await fs.readFile(parsed.path);
    const sourceFile = project.createSourceFile(
      parsed.path,
      content.toString(),
      {
        overwrite: true,
      },
    );

    const outputPath =
      typeof file === 'string'
        ? builder.resolveOutputPath(parsed.path, parsed.namespace)
        : file.out;
    const queue: string[] = [];

    files.push(
      await buildFile(
        outputPath,
        sourceFile,
        builder,
        component,
        (reference) => {
          if (reference.type === 'file') {
            queue.push(path.relative(registryDir, reference.file));
            return builder.resolveOutputPath(reference.file);
          }

          if (reference.type === 'sub-component') {
            subComponents.add(reference.component.name);
            const targetFile = path.relative(registryDir, reference.targetFile);

            for (const childFile of reference.component.files) {
              if (typeof childFile === 'string' && childFile === targetFile) {
                return builder.resolveOutputPath(
                  path.join(registryDir, childFile),
                );
              }

              if (
                typeof childFile === 'object' &&
                childFile.in === targetFile
              ) {
                return childFile.out;
              }
            }
          }

          if (reference.type === 'dependency') {
            if (reference.isDev)
              devDependencies.set(reference.name, reference.version);
            else dependencies.set(reference.name, reference.version);
          }
        },
      ),
    );

    await Promise.all(queue.map(build));
  }

  await Promise.all(component.files.map(build));

  return [
    component,
    {
      name: component.name,
      files,
      subComponents: Array.from(subComponents),
      dependencies: Object.fromEntries(dependencies),
      devDependencies: Object.fromEntries(devDependencies),
    },
  ] as [Component, OutputComponent];
}
