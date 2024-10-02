import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { Project, type SourceFile, type StringLiteral } from 'ts-morph';
import {
  type ComponentBuilder,
  createComponentBuilder,
} from './component-builder';

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
    const comp: OutputComponent = {
      name: component.name,
      files: [],
      devDependencies: {},
      dependencies: {},
      subComponents: [],
    };

    const read = component.files
      .map((file) => path.join(registryDir, file))
      .map(async (file) => {
        const content = await fs.readFile(file);
        const sourceFile = project.createSourceFile(file, content.toString(), {
          overwrite: true,
        });

        await addFile(sourceFile, builder, comp, component);
      });

    await Promise.all(read);
    return [component, comp] as const;
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

async function addFile(
  sourceFile: SourceFile,
  builder: ComponentBuilder,
  ctx: OutputComponent,
  comp: Component,
): Promise<string> {
  const outputPath = builder.resolveOutputPath(sourceFile.getFilePath());
  if (ctx.files.some((item) => item.path === outputPath)) return outputPath;

  const out: OutputFile = {
    imports: {},
    content: '',
    path: outputPath,
  };

  ctx.files.push(out);

  /**
   * Process import paths
   */
  async function process(
    specifier: StringLiteral,
    getSpecifiedFile: () => SourceFile | undefined,
  ): Promise<void> {
    let specifiedFile = getSpecifiedFile();
    if (!specifiedFile) return;

    const name = specifiedFile.isInNodeModules()
      ? builder.resolveDep(specifier.getLiteralValue()).name
      : path.relative(builder.registryDir, specifiedFile.getFilePath());

    if (comp.mapImportPath && name in comp.mapImportPath) {
      const resolver = comp.mapImportPath[name];

      if (typeof resolver === 'string') {
        specifier.setLiteralValue(resolver);
        specifiedFile = getSpecifiedFile();

        if (!specifiedFile) return;
      } else {
        ctx.subComponents.push(resolver.name);
        out.imports[specifier.getLiteralValue()] = resolver.file;
        return;
      }
    }

    if (specifiedFile.isInNodeModules() || specifiedFile.isDeclarationFile()) {
      const info = builder.resolveDep(specifier.getLiteralValue());

      if (info.type === 'dev') {
        ctx.devDependencies[info.name] = info.version ?? '';
      } else {
        ctx.dependencies[info.name] = info.version ?? '';
      }
      return;
    }

    const sub = builder.getSubComponent(specifiedFile.getFilePath());
    if (sub) {
      if (!ctx.subComponents.includes(sub.component.name))
        ctx.subComponents.push(sub.component.name);

      out.imports[specifier.getLiteralValue()] = builder.resolveOutputPath(
        specifiedFile.getFilePath(),
      );
      return;
    }

    out.imports[specifier.getLiteralValue()] = await addFile(
      specifiedFile,
      builder,
      ctx,
      comp,
    );
  }

  for (const item of sourceFile.getImportDeclarations()) {
    await process(item.getModuleSpecifier(), () =>
      item.getModuleSpecifierSourceFile(),
    );
  }

  for (const item of sourceFile.getExportDeclarations()) {
    const specifier = item.getModuleSpecifier();
    if (!specifier) continue;

    await process(specifier, () => item.getModuleSpecifierSourceFile());
  }

  out.content = sourceFile.getFullText();
  return outputPath;
}
