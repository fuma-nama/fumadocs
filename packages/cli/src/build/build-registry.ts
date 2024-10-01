import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { Project, type SourceFile, type StringLiteral } from 'ts-morph';
import {
  type ComponentBuilder,
  createComponentBuilder,
} from './component-builder';

export interface Component {
  name: string;
  files: string[];

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
  components: OutputComponent[];
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
        return schema.registry.components;
      }

      return (await build(schema.registry)).components;
    },
  );

  output.components.push(
    ...(await Promise.all(buildExtendRegistries).then((res) => res.flat())),
  );

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
    output.components.push(comp);
  });

  await Promise.all(buildComps);
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
   * Handle import path mappings
   */
  function preprocess(
    specifiedFile: SourceFile,
    specifier: StringLiteral,
  ): void {
    const name = specifiedFile.isInNodeModules()
      ? builder.resolveDep(specifier.getLiteralValue()).name
      : path.relative(builder.registryDir, specifiedFile.getFilePath());

    if (!comp.mapImportPath || !(name in comp.mapImportPath)) return;
    const resolver = comp.mapImportPath[name];

    if (typeof resolver === 'string') {
      specifier.setLiteralValue(resolver);
      return;
    }

    ctx.subComponents.push(resolver.name);
    out.imports[specifier.getLiteralValue()] = resolver.file;
  }

  async function process(
    specifiedFile: SourceFile,
    specifier: StringLiteral,
  ): Promise<void> {
    if (specifier.getLiteralValue() in out.imports) return;
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
    const specifier = item.getModuleSpecifier();
    let refFile = item.getModuleSpecifierSourceFile();
    if (!refFile) continue;

    preprocess(refFile, specifier);
    refFile = item.getModuleSpecifierSourceFile();
    if (!refFile) continue;

    await process(refFile, specifier);
  }

  for (const item of sourceFile.getExportDeclarations()) {
    const specifier = item.getModuleSpecifier();
    let refFile = item.getModuleSpecifierSourceFile();
    if (!specifier || !refFile) continue;

    preprocess(refFile, specifier);
    refFile = item.getModuleSpecifierSourceFile();
    if (!refFile) continue;

    await process(refFile, specifier);
  }

  out.content = sourceFile.getFullText();
  return outputPath;
}
