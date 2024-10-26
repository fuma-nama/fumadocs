import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { Project } from 'ts-morph';
import { buildFile, merge, type ProcessedFiles } from '@/build/build-file';
import { createComponentBuilder } from './component-builder';

export interface Component {
  name: string;
  description?: string;
  files: string[];

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
  const output: Output = {
    index: [],
    components: [],
  };

  const project = new Project({
    tsConfigFilePath: registry.tsconfigPath
      ? path.join(registryDir, registry.tsconfigPath)
      : path.join(rootDir, 'tsconfig.json'),
  });
  const packageJson =
    typeof registry.packageJson !== 'string' && registry.packageJson
      ? registry.packageJson
      : await fs
          .readFile(
            registry.packageJson
              ? path.join(registryDir, registry.packageJson)
              : path.join(rootDir, 'package.json'),
          )
          .then((res) => JSON.parse(res.toString()) as PackageJson)
          .catch(() => undefined);

  const builder = createComponentBuilder(
    registry,
    packageJson,
    registryDir,
    rootDir,
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

  const buildComps = registry.components.map(async (component) => {
    const processedFiles = new Set<string>();
    const collect: ProcessedFiles = {
      files: [],
      subComponents: new Set(),
      devDependencies: new Map(),
      dependencies: new Map(),
    };

    const read = component.files
      .map((file) => path.join(registryDir, file))
      .map(async (file) => {
        const content = await fs.readFile(file);
        const sourceFile = project.createSourceFile(file, content.toString(), {
          overwrite: true,
        });

        const outputPath = builder.resolveOutputPath(sourceFile.getFilePath());

        if (processedFiles.has(outputPath)) return;
        return buildFile(
          outputPath,
          sourceFile,
          builder,
          component,
          processedFiles,
        );
      });

    const outFiles = await Promise.all(read);
    for (const file of outFiles) {
      if (!file) continue;

      merge(collect, file);
    }

    return [
      component,
      {
        name: component.name,
        files: collect.files,
        subComponents: Array.from(collect.subComponents),
        dependencies: Object.fromEntries(collect.dependencies),
        devDependencies: Object.fromEntries(collect.devDependencies),
      },
    ] as [Component, OutputComponent];
  });

  for (const [input, comp] of await Promise.all(buildComps)) {
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
