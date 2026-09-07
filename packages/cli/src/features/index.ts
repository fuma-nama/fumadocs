import fs from 'node:fs/promises';
import path from 'node:path';
import { x } from 'tinyexec';
import type { RegistryConnector } from 'fuma-cli/registry/connector';
import type { Project } from '@/project';
import { createSourceFile, type SourceFile } from '@/codemod';
import { FumadocsComponentInstaller } from '@/registry/installer';
import { exists } from '@/utils/fs';

export interface SelectOption<T> {
  message: string;
  choices: { value: T; label: string; hint?: string }[];
}

export interface Feature<Options extends object = Record<never, never>> {
  id: string;
  title: string;
  description: string;
  options?: { [K in keyof Options]: SelectOption<Options[K]> };
  /** features that must be applied first */
  requires?: AnyFeature[];
  /** whether the feature is already applied to the project */
  detect?: (project: Project) => Promise<boolean>;
  /** @returns `true` if supported, otherwise the reason */
  supports?: (project: Project) => true | string;
  apply(ctx: FeatureContext, options: Options): Promise<void>;
}

export type AnyFeature = Feature<Record<string, unknown>>;

export interface FeatureContext {
  project: Project;
  /** write a file (relative to project root), asks before overwriting */
  write: (file: string, content: string) => Promise<void>;
  /** edit a file with codemods, `false` if the file doesn't exist */
  source: (file: string, edit: (file: SourceFile) => void) => Promise<boolean>;
  /** append lines to a text file, skip lines already present */
  append: (file: string, lines: string[]) => Promise<void>;
  /** install a registry component */
  install: (name: string, subRegistry?: string) => Promise<void>;
  /** `null` to install the latest version */
  addDependencies: (deps: Record<string, string | null>, dev?: boolean) => void;
  env: (key: string, value: string) => void;
  /** instructions to show after the feature is applied */
  note: (text: string) => void;
  log: (message: string) => void;
}

export interface FeatureIO {
  log: (message: string) => void;
  confirmOverwrite: (file: string) => Promise<boolean>;
  /** run package manager to install dependencies, otherwise only write them into `package.json` */
  installDependencies: boolean;
}

export interface RunOptions {
  project: Project;
  connector: RegistryConnector;
  io: FeatureIO;
}

export async function runFeature<O extends object>(
  feature: Feature<O>,
  options: O,
  { project, connector, io }: RunOptions,
): Promise<{ notes: string[] }> {
  for (const dep of feature.requires ?? []) {
    if (dep.detect && !(await dep.detect(project)))
      throw new Error(
        `"${feature.id}" requires "${dep.id}", run \`fumadocs feature ${dep.id}\` first.`,
      );
  }
  const supported = feature.supports?.(project) ?? true;
  if (supported !== true) throw new Error(`"${feature.id}" is unavailable: ${supported}`);

  const { cwd } = project;
  const deps: Record<string, string | null> = {};
  const devDeps: Record<string, string | null> = {};
  const env: string[] = [];
  const notes: string[] = [];
  const installer = new FumadocsComponentInstaller(connector, project.config, cwd, {
    onWarn: io.log,
    confirmFileOverride: ({ path: file }) => io.confirmOverwrite(path.relative(cwd, file)),
    onFileDownloaded: ({ path: file }) => io.log(`installed ${path.relative(cwd, file)}`),
  });

  const ctx: FeatureContext = {
    project,
    log: io.log,
    note: (text) => notes.push(text),
    env: (key, value) => env.push(`${key}=${value}`),
    addDependencies(input, dev) {
      Object.assign(dev ? devDeps : deps, input);
    },
    async write(file, content) {
      const target = path.join(cwd, file);
      const current = await fs.readFile(target, 'utf-8').catch(() => null);
      if (current !== null) {
        if (current.trim() === content.trim()) return;
        if (!(await io.confirmOverwrite(file))) return;
      }
      await fs.mkdir(path.dirname(target), { recursive: true });
      await fs.writeFile(target, content);
      io.log(`${current === null ? 'created' : 'updated'} ${file}`);
    },
    async source(file, edit) {
      const target = path.join(cwd, file);
      if (!(await exists(target))) return false;
      const source = await createSourceFile(target);
      edit(source);
      if (source.s.hasChanged()) {
        await source.save();
        io.log(`updated ${file}`);
      }
      return true;
    },
    async append(file, lines) {
      const target = path.join(cwd, file);
      const current = await fs.readFile(target, 'utf-8').catch(() => '');
      const missing = lines.filter((line) => !current.includes(line));
      if (missing.length === 0) return;
      const separator = current.length === 0 || current.endsWith('\n') ? '' : '\n';
      await fs.mkdir(path.dirname(target), { recursive: true });
      await fs.writeFile(target, `${current}${separator}${missing.join('\n')}\n`);
      io.log(`updated ${file}`);
    },
    async install(name, subRegistry) {
      const result = await installer.install(name, subRegistry);
      const manager = await result.deps();
      // encoded as `name` or `name@version`
      const decode = (target: Record<string, string | null>, dep: string) => {
        const at = dep.indexOf('@', 1);
        if (at === -1) target[dep] = null;
        else target[dep.slice(0, at)] = dep.slice(at + 1);
      };
      for (const dep of manager.dependencies) decode(deps, dep);
      for (const dep of manager.devDependencies) decode(devDeps, dep);
    },
  };

  await feature.apply(ctx, options);

  if (env.length > 0) await ctx.append('.env.local', env);
  await installDependencies(project, deps, devDeps, io);
  return { notes };
}

async function installDependencies(
  project: Project,
  deps: Record<string, string | null>,
  devDeps: Record<string, string | null>,
  io: FeatureIO,
) {
  const { dependencies = {}, devDependencies = {} } = project.packageJson;
  const filter = (input: Record<string, string | null>) =>
    Object.entries(input).filter(([name]) => !(name in dependencies) && !(name in devDependencies));
  const missing = filter(deps);
  const missingDev = filter(devDeps);
  if (missing.length === 0 && missingDev.length === 0) return;

  if (io.installDependencies) {
    const pm = project.packageManager;
    const run = async (flags: string[], entries: [string, string | null][]) => {
      if (entries.length === 0) return;
      const args = [
        'add',
        ...flags,
        ...entries.map(([name, version]) => (version ? `${name}@${version}` : name)),
      ];
      io.log(`${pm} ${args.join(' ')}`);
      await x(pm, args, {
        nodeOptions: { cwd: project.cwd, stdio: 'inherit' },
        throwOnError: true,
      });
    };
    await run([], missing);
    await run(['-D'], missingDev);
    return;
  }

  const file = path.join(project.cwd, 'package.json');
  const json = JSON.parse(await fs.readFile(file, 'utf-8'));
  const write = (field: string, entries: [string, string | null][]) => {
    if (entries.length === 0) return;
    const target = (json[field] ??= {});
    for (const [name, version] of entries) target[name] = version ?? 'latest';
  };
  write('dependencies', missing);
  write('devDependencies', missingDev);
  await fs.writeFile(file, JSON.stringify(json, null, 2));
  io.log('updated package.json');
}
