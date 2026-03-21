import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import type {
  CompiledComponent,
  CompiledFile,
  httpSubComponent,
  NamespaceType,
  registryInfoSchema,
} from '@/registry/schema';
import type { z } from 'zod';
import { parse } from 'oxc-parser';
import { ResolverFactory } from 'oxc-resolver';
import MagicString from 'magic-string';
import { transformSpecifiers } from '@/utils/ast';
import { isRelative } from '@/utils/fs';

export type OnResolve = (
  reference: SourceReference,
  from: { component: Component; file: ComponentFile },
) => Reference;

export interface CompiledRegistry {
  name: string;
  components: CompiledComponent[];
  info: z.output<typeof registryInfoSchema>;
}

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
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;

  /**
   * Don't list the component in registry index file
   */
  unlisted?: boolean;

  /**
   * Map imported file paths, inherit from registry if not defined.
   */
  onResolve?: OnResolve;
}

export interface PackageJson {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
}

export interface Registry extends Omit<z.input<typeof registryInfoSchema>, 'indexes'> {
  name: string;
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
   * @returns file, or `false` to mark as external.
   */
  onUnknownFile?: (absolutePath: string) => ComponentFile | false | undefined;

  dependencies?: Record<string, string | null>;
  devDependencies?: Record<string, string | null>;
}

export class RegistryCompiler {
  readonly raw: Registry;
  resolver!: RegistryResolver;

  constructor(registry: Registry) {
    this.raw = registry;
  }

  private async readPackageJson(): Promise<PackageJson | undefined> {
    if (typeof this.raw.packageJson !== 'string') return this.raw.packageJson;

    return fs
      .readFile(path.join(this.raw.dir, this.raw.packageJson))
      .then((res) => JSON.parse(res.toString()) as PackageJson)
      .catch(() => undefined);
  }

  async compile(): Promise<CompiledRegistry> {
    const registry = this.raw;
    this.resolver = new RegistryResolver(this, await this.readPackageJson());
    const output: CompiledRegistry = {
      name: registry.name,
      info: {
        indexes: [],
        unlistedIndexes: [],
        env: registry.env,
        variables: registry.variables,
      },
      components: [],
    };

    const builtComps = await Promise.all(
      registry.components.map(async (component) => {
        const compiler = new ComponentCompiler(this, component);

        return [component, await compiler.build()] as [Component, CompiledComponent];
      }),
    );

    for (const [input, comp] of builtComps) {
      const arr = input.unlisted ? output.info.unlistedIndexes : output.info.indexes;

      arr.push({
        name: input.name,
        title: input.title,
        description: input.description,
      });
      output.components.push(comp);
    }

    return output;
  }
}

class RegistryResolver {
  private readonly deps: Record<string, string | null>;
  private readonly devDeps: Record<string, string | null>;
  private readonly fileToComponent = new Map<string, [Component, ComponentFile]>();
  readonly oxc: ResolverFactory;

  constructor(
    private readonly compiler: RegistryCompiler,
    packageJson: PackageJson = {},
  ) {
    const registry = compiler.raw;

    for (const comp of registry.components) {
      for (const file of comp.files) {
        if (this.fileToComponent.has(file.path))
          console.warn(
            `the same file ${file.path} exists in multiple component, you should make the shared file a separate component.`,
          );
        this.fileToComponent.set(file.path, [comp, file]);
      }
    }

    this.deps = {
      ...packageJson?.dependencies,
      ...registry.dependencies,
    };

    this.devDeps = {
      ...packageJson?.devDependencies,
      ...registry.devDependencies,
    };

    // resolve anything possible
    this.oxc = new ResolverFactory({
      extensions: ['.js', '.jsx', '.ts', '.tsx', '.node'],
      conditionNames: ['node', 'import', 'require', 'default', 'types'],
      tsconfig: {
        configFile: path.join(registry.dir, registry.tsconfigPath),
      },
    });
  }

  getDepFromSpecifier(specifier: string) {
    return specifier.startsWith('@')
      ? specifier.split('/').slice(0, 2).join('/')
      : specifier.split('/')[0];
  }

  getDepInfo(name: string):
    | {
        type: 'runtime' | 'dev';
        name: string;
        version: string | null;
      }
    | undefined {
    if (name in this.deps)
      return {
        name,
        type: 'runtime',
        version: this.deps[name],
      };

    if (name in this.devDeps)
      return {
        name,
        type: 'dev',
        version: this.devDeps[name],
      };

    console.warn(`dep info for ${name} cannot be found`);
  }

  getComponentByName(name: string): Component | undefined {
    return this.compiler.raw.components.find((comp) => comp.name === name);
  }

  getSubComponent(file: string) {
    const relativeFile = path.relative(this.compiler.raw.dir, file);
    const comp = this.fileToComponent.get(relativeFile);

    if (!comp) return;
    return {
      component: comp[0],
      file: comp[1],
    };
  }
}

export type SourceReference =
  | {
      type: 'file';
      /**
       * Absolute path
       */
      file: string;
    }
  | {
      type: 'dependency';
      dep: string;
      specifier: string;
    }
  | {
      type: 'sub-component';
      resolved:
        | {
            type: 'local';
            component: Component;
            file: ComponentFile;
          }
        | {
            type: 'remote';
            component: Component;
            file: ComponentFile;
            registryName: string;
          };
    }
  | {
      type: 'unknown-specifier';
      specifier: string;
    };

export type Reference =
  | SourceReference
  | {
      type: 'custom';
      specifier: string;
    };

export class ComponentCompiler {
  private readonly processedFiles = new Set<string>();
  private readonly registry: Registry;
  private readonly subComponents = new Map<string, string | z.input<typeof httpSubComponent>>();
  private readonly devDependencies = new Map<string, string | null>();
  private readonly dependencies = new Map<string, string | null>();

  constructor(
    private readonly compiler: RegistryCompiler,
    private readonly component: Component,
  ) {
    this.registry = compiler.raw;
  }

  private toImportPath(file: ComponentFile): string {
    let filePath = file.target ?? file.path;

    if (filePath.startsWith('./')) filePath = filePath.slice(2);

    return `@/${filePath.replaceAll(path.sep, '/')}`;
  }

  async build(): Promise<CompiledComponent> {
    const files = (
      await Promise.all(this.component.files.map((file) => this.onBuildFile(file)))
    ).flat();
    const dependencies = Object.fromEntries(this.dependencies);
    const devDependencies = Object.fromEntries(this.devDependencies);

    if (this.component.dependencies) {
      Object.assign(dependencies, this.component.dependencies);
    }
    if (this.component.devDependencies) {
      Object.assign(devDependencies, this.component.devDependencies);
    }

    return {
      name: this.component.name,
      title: this.component.title,
      description: this.component.description,
      files,
      subComponents: Array.from(this.subComponents.values()),
      dependencies,
      devDependencies,
    };
  }

  private async onBuildFile(file: ComponentFile): Promise<CompiledFile[]> {
    if (this.processedFiles.has(file.path)) return [];
    this.processedFiles.add(file.path);
    const resolver = this.compiler.resolver;

    const queue: ComponentFile[] = [];
    const result = await this.buildFile(file, (reference) => {
      if (reference.type === 'unknown-specifier') {
        if (!reference.specifier.startsWith('node:')) {
          console.warn(`Unknown specifier ${reference.specifier}, skipping for now`);
        }

        return reference.specifier;
      }

      if (reference.type === 'custom') return reference.specifier;

      if (reference.type === 'file') {
        const refFile = this.registry.onUnknownFile?.(reference.file);
        if (refFile) {
          queue.push(refFile);
          return this.toImportPath(refFile);
        }

        if (refFile === false) return;

        throw new Error(`Unknown file ${reference.file} referenced by ${file.path}`);
      }

      if (reference.type === 'sub-component') {
        const resolved = reference.resolved;
        if (resolved.component.name === this.component.name)
          return this.toImportPath(resolved.file);

        if (resolved.type === 'remote') {
          this.subComponents.set(`${resolved.registryName}:${resolved.component.name}`, {
            type: 'http',
            baseUrl: resolved.registryName,
            component: resolved.component.name,
          });
        } else {
          this.subComponents.set(resolved.component.name, resolved.component.name);
        }

        return this.toImportPath(resolved.file);
      }

      const dep = resolver.getDepInfo(reference.dep);
      if (dep) {
        const map = dep.type === 'dev' ? this.devDependencies : this.dependencies;
        map.set(dep.name, dep.version);
      }

      return reference.specifier;
    });

    return [result, ...(await Promise.all(queue.map((file) => this.onBuildFile(file)))).flat()];
  }

  private async buildFile(
    file: ComponentFile,
    /**
     * write references back to import specifiers
     *
     * keep original one if `undefined`
     */
    writeReference: (reference: Reference) => string | undefined,
  ): Promise<CompiledFile> {
    const sourceFilePath = path.join(this.registry.dir, file.path);
    const astTypes: Record<string, 'js' | 'ts' | undefined> = {
      '.ts': 'ts',
      '.tsx': 'ts',
      '.js': 'js',
      '.jsx': 'js',
    };
    const astType = astTypes[path.extname(file.path)];
    const content = (await fs.readFile(sourceFilePath)).toString();

    if (!astType)
      return {
        content,
        path: file.path,
        type: file.type,
        target: file.target,
      };

    const resolver = this.compiler.resolver;

    const ast = await parse(sourceFilePath, content, {
      astType,
    });

    if (ast.errors.length > 0) {
      throw new Error(`failed to parse file ${sourceFilePath}: \n${ast.errors.join('\n')}`);
    }

    const s = new MagicString(content);
    const ctx = { component: this.component, file };
    // Process import paths
    transformSpecifiers(ast.program, s, (specifier) => {
      let resolved: Reference = {
        type: 'unknown-specifier',
        specifier: specifier,
      };
      const onResolve = this.component.onResolve ?? this.registry.onResolve;
      const resolvedSpecifier = resolver.oxc.resolveFileSync(sourceFilePath, specifier);
      if (resolvedSpecifier.error || !resolvedSpecifier.path) {
        return writeReference(onResolve ? onResolve(resolved, ctx) : resolved);
      }

      resolved = {
        type: 'file',
        file: resolvedSpecifier.path,
      };

      // outside of registry dir
      if (!isRelative(this.registry.dir, resolvedSpecifier.path)) {
        resolved = {
          type: 'dependency',
          dep: resolver.getDepFromSpecifier(specifier),
          specifier,
        };
      } else {
        const sub = resolver.getSubComponent(resolvedSpecifier.path);
        if (sub) {
          resolved = {
            type: 'sub-component',
            resolved: {
              type: 'local',
              component: sub.component,
              file: sub.file,
            },
          };
        }
      }

      return writeReference(onResolve ? onResolve(resolved, ctx) : resolved);
    });

    return {
      content: s.toString(),
      type: file.type,
      path: file.path,
      target: file.target,
    };
  }
}

export function resolveFromRemote(
  r: Registry,
  component: string,
  selectFile: (file: ComponentFile) => boolean,
): Reference | undefined {
  const comp = r.components.find((comp) => comp.name === component);
  if (!comp) return;
  const file = comp.files.find(selectFile);
  if (!file) return;

  return {
    type: 'sub-component',
    resolved: {
      type: 'remote',
      registryName: r.name,
      component: comp,
      file,
    },
  };
}
