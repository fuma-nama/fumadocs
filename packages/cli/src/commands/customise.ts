import fs from 'node:fs/promises';
import path from 'node:path';
import { cancel, group, intro, log, outro, select, type Option } from '@clack/prompts';
import picocolors from 'picocolors';
import { parseSourceFile } from '@/codemod';
import { frameworks, loadProject, type Project } from '@/project';
import type { Target } from '@/commands/add';
import { UIRegistries } from '@/commands/shared';
import { LoadedConfig } from '@/config';
import { RegistryConnector } from 'fuma-cli/registry/connector';
import { FumadocsComponentInstaller } from '@/registry/installer';
import { runFeature } from '@/features';
import { astroPage } from '@/features/docs/templates';
import { astroModule, requiresManaged } from '@/features/utils';

interface TargetInfo {
  targets: Target[];
  id: string;
  /** the layout of docs pages, defaults to `id` */
  layout?: string;
  /** `files` render the docs layouts */
  print?: (files: string[]) => void | Promise<void>;
}

interface SlotPrintInfo {
  at: string;
  layoutId: string;
  name: string;
  isPage: boolean;
  uiLibrary: LoadedConfig['uiLibrary'];
}

export async function customise(config: LoadedConfig, connector: RegistryConnector) {
  intro(picocolors.bgBlack(picocolors.whiteBright('Customize Fumadocs UI')));
  // Astro renders docs pages with the `page` module of the Fumadocs integration
  const astro = config.framework === 'astro' ? await loadProject(config) : undefined;
  const supported = astro ? requiresManaged(astro) : true;
  if (supported !== true) {
    cancel(supported);
    process.exit(1);
  }

  const installer = new FumadocsComponentInstaller(connector, config);
  const subRegistry = UIRegistries[config.uiLibrary];
  const manifest = await installer.fetchManifest(subRegistry);

  const result = await group(
    {
      layout: (): Promise<TargetInfo | symbol> =>
        select({
          message: 'What do you want to customize?',
          options: [
            {
              label: 'Docs Layout',
              value: {
                id: 'docs',
                targets: [{ subRegistry, name: 'layouts/docs' }],
                print: (files) =>
                  printLayout(
                    files,
                    ['fumadocs-ui/layouts/docs', '@/layouts/docs'],
                    ['fumadocs-ui/layouts/docs/page', '@/layouts/docs/page'],
                  ),
              },
              hint: 'the default docs layout',
            },
            {
              label: 'Notebook Layout',
              value: {
                id: 'notebook',
                targets: [{ subRegistry, name: 'layouts/notebook' }],
                print: (files) =>
                  printLayout(
                    files,
                    ['fumadocs-ui/layouts/notebook', '@/layouts/notebook'],
                    ['fumadocs-ui/layouts/notebook/page', '@/layouts/notebook/page'],
                  ),
              },
              hint: 'a more compact version of docs layout',
            },
            {
              label: 'Flux Layout',
              value: {
                id: 'flux',
                targets: [{ subRegistry, name: 'layouts/flux' }],
                print: (files) =>
                  printLayout(
                    files,
                    ['fumadocs-ui/layouts/flux', '@/layouts/flux'],
                    ['fumadocs-ui/layouts/flux/page', '@/layouts/flux/page'],
                  ),
              },
              hint: 'the experimental variant of docs layout',
            },
            {
              label: 'Glass Layout',
              value: {
                id: 'glass',
                targets: [{ subRegistry, name: 'layouts/glass' }],
                print: (files) =>
                  printLayout(
                    files,
                    ['fumadocs-ui/layouts/glass', '@/layouts/glass'],
                    ['fumadocs-ui/layouts/glass/page', '@/layouts/glass/page'],
                  ),
              },
              hint: 'a docs layout with floating, translucent panels',
            },
            ...(config.uiLibrary === 'base-ui'
              ? [
                  {
                    label: 'Spacious Layout',
                    value: {
                      id: 'spacious',
                      targets: [{ subRegistry, name: 'layouts/spacious' }],
                      print: (files: string[]) =>
                        printLayout(
                          files,
                          ['fumadocs-ui/layouts/spacious', '@/layouts/spacious'],
                          ['fumadocs-ui/layouts/spacious/page', '@/layouts/spacious/page'],
                        ),
                    },
                    hint: 'a docs layout with the page in an inset panel, Base UI only',
                  },
                ]
              : []),
            {
              label: 'Home Layout',
              value: {
                id: 'home',
                targets: [{ subRegistry, name: 'layouts/home' }],
                print: (files) =>
                  printLayout(files, ['fumadocs-ui/layouts/home', '@/layouts/home']),
              },
              hint: 'the layout for other non-docs pages',
            },
          ],
        }),
      target: (v): Promise<TargetInfo | symbol> => {
        const selected = v.results.layout!;
        if (selected.id === 'home') return Promise.resolve(selected);

        const slots: Option<TargetInfo>[] = [];
        const prefix = `layouts/${selected.id}/`;
        for (const { name: id } of manifest.components) {
          // <layout>/slots/<name> or <layout>/page/slots/<name>
          const [dir, name] = id.startsWith(prefix) ? id.slice(prefix.length).split('slots/') : [];
          if (name === undefined) continue;
          const isPage = dir === 'page/';

          slots.push({
            label: `${isPage ? 'Page' : 'Layout'}: ${name}`,
            hint: `only replace a part of layout${isPage ? "'s page" : ''}, useful for adjusting details`,
            value: {
              id,
              layout: selected.id,
              targets: [{ subRegistry, name: id }],
              print() {
                printSlot({
                  at: `@/${id}`,
                  layoutId: selected.id,
                  name,
                  isPage,
                  uiLibrary: config.uiLibrary,
                });
              },
            },
          });
        }

        return select<TargetInfo>({
          message: 'Which part do you want to customize?',
          options: [
            {
              label: 'All',
              hint: 'install the entire layout',
              value: selected,
            },
            {
              label: 'Replace & rewrite from minimal styles',
              hint: 'for those who want to build their own UI from ground up',
              value: {
                id: 'docs-min',
                layout: 'docs',
                targets: [{ name: 'layouts/docs-min' }],
                print: (files) =>
                  printLayout(
                    files,
                    ['fumadocs-ui/layouts/docs', '@/layouts/docs'],
                    ['fumadocs-ui/layouts/docs/page', '@/layouts/docs/page'],
                  ),
              },
            },
            ...slots,
          ],
        });
      },
    },
    {
      onCancel: () => {
        cancel('Installation Stopped.');
        process.exit(0);
      },
    },
  );

  const targetInfo = result.target as TargetInfo;
  for (const target of targetInfo.targets) {
    await installer.installInteractive(target.name, target.subRegistry);
  }

  await targetInfo.print?.(
    astro ? await writeAstroPage(astro, connector, targetInfo) : await routeFiles(config),
  );

  outro(picocolors.bold('Have fun!'));
}

/** the route files of the framework */
export async function routeFiles(config: LoadedConfig) {
  const dir = path.join(config.baseDir, frameworks[config.framework].routesDir);
  const entries = await fs.readdir(dir, { recursive: true, withFileTypes: true }).catch(() => []);
  const files: string[] = [];
  for (const entry of entries) {
    if (entry.isFile() && entry.name.endsWith('.tsx'))
      files.push(path.join(entry.parentPath, entry.name));
  }
  return files;
}

/** the `page` module of the Fumadocs integration, created to render the layout of the target */
async function writeAstroPage(
  project: Project,
  connector: RegistryConnector,
  { id, layout = id }: TargetInfo,
): Promise<string[]> {
  if (id === 'home') return [];
  let file: string | undefined;
  await runFeature(
    {
      id: 'customise',
      title: 'Docs Page',
      description: 'the page module of the Fumadocs integration',
      async apply(ctx) {
        file = await astroModule(ctx, 'page', astroPage(`fumadocs-ui/layouts/${layout}`));
      },
    },
    {},
    {
      project,
      connector,
      io: {
        installDependencies: true,
        log: (message) => log.info(message),
        confirmOverwrite: async () => false,
      },
    },
  );
  return file ? [file] : [];
}

/** point the imports of `files` at the installed layouts */
export async function rewriteLayoutImports(files: string[], map: Map<string, string>) {
  const updated: string[] = [];

  for (const file of files) {
    const source = parseSourceFile(file, await fs.readFile(file, 'utf-8'));
    for (const node of source.program.body) {
      if (node.type !== 'ImportDeclaration') continue;
      const to = map.get(node.source.value);
      if (to) source.s.overwrite(node.source.start + 1, node.source.end - 1, to);
    }
    if (!source.s.hasChanged()) continue;
    await source.save();
    updated.push(file);
  }

  return updated;
}

async function printLayout(files: string[], ...maps: [from: string, to: string][]) {
  intro(picocolors.bold('What is Next?'));
  const updated = await rewriteLayoutImports(files, new Map(maps));

  log.info(
    [
      'You can check the installed layouts in `layouts` folder.',
      picocolors.dim('---'),
      updated.length > 0
        ? `Updated the imports of ${updated.join(', ')}.`
        : 'Open your `layout.tsx` files, replace the imports of components:',
      ...maps.map(([from, to]) => picocolors.greenBright(`"${from}" -> "${to}"`)),
    ].join('\n'),
  );
}

function printSlot({ at, layoutId, name, isPage, uiLibrary }: SlotPrintInfo) {
  intro(picocolors.bold('What is Next?'));

  log.info(`You can check the installed layout slot in "${at}".`);

  const slot = getSlot({ layoutId, name, isPage, uiLibrary });
  if (!slot) return;

  const [imports, value] = slot;
  // every layout names its components `DocsLayout` and `DocsPage`
  const component = isPage ? 'DocsPage' : 'DocsLayout';
  log.info(`${picocolors.bold(`At your <${component} /> component, update your "slots" prop:`)}

import { ${imports} } from '${at}';

return (
  <${component}
    slots={{
      ${value},
    }}
  >
    ...
  </${component}>
);`);
}

/** the names to import from slot file, and the entry of `slots` prop */
function getSlot({
  layoutId,
  name,
  isPage,
  uiLibrary,
}: Omit<SlotPrintInfo, 'at'>): [imports: string, value: string] | undefined {
  if (isPage) {
    // Glass layout wires its page slots directly, only layout-level slots are swappable.
    if (layoutId === 'glass') return;

    switch (name) {
      case 'toc':
        if (layoutId === 'flux')
          return [
            'TOCProvider, TOC',
            `toc: {
        provider: TOCProvider,
        main: TOC,
      }`,
          ];
        if (layoutId === 'spacious')
          return [
            'TOCProvider, TOC, TOCPopover, TOCDropdown',
            `toc: {
        provider: TOCProvider,
        main: TOC,
        popover: TOCPopover,
        dropdown: TOCDropdown,
      }`,
          ];
        return [
          'TOCProvider, TOC, TOCPopover',
          `toc: {
        provider: TOCProvider,
        main: TOC,
        popover: TOCPopover,
      }`,
        ];
      case 'container':
        return ['Container', 'container: Container'];
      case 'footer':
        return ['Footer', 'footer: Footer'];
      case 'breadcrumb':
        return ['Breadcrumb', 'breadcrumb: Breadcrumb'];
      default:
        return;
    }
  }

  switch (name) {
    case 'sidebar':
      if (layoutId === 'glass') {
        // the slot file holds the whole sidebar system, Base UI additionally exposes a `drawerHandle` for its swipeable drawer
        const drawerHandle = uiLibrary === 'base-ui';
        return [
          `Sidebar, SidebarDrawer, SidebarProvider, useSidebar${drawerHandle ? ', drawerHandle' : ''}`,
          `sidebar: {
        main: Sidebar,
        provider: SidebarProvider,
        use: useSidebar,
        drawer: SidebarDrawer,${drawerHandle ? '\n        drawerHandle,' : ''}
      }`,
        ];
      }
      if (layoutId === 'spacious')
        return [
          'Sidebar, SidebarDrawer, SidebarProvider',
          `sidebar: {
        provider: SidebarProvider,
        main: Sidebar,
        drawer: SidebarDrawer,
      }`,
        ];
      if (layoutId === 'notebook')
        return [
          'SidebarProvider, Sidebar, SidebarTrigger, SidebarCollapseTrigger, useSidebar',
          `sidebar: {
        provider: SidebarProvider,
        root: Sidebar,
        trigger: SidebarTrigger,
        collapseTrigger: SidebarCollapseTrigger,
        useSidebar: useSidebar,
      }`,
        ];
      return [
        'SidebarProvider, Sidebar, SidebarTrigger, useSidebar',
        `sidebar: {
        provider: SidebarProvider,
        root: Sidebar,
        trigger: SidebarTrigger,
        useSidebar: useSidebar,
      }`,
      ];
    case 'header':
      return ['Header', 'header: Header'];
    case 'container':
      return ['Container', 'container: Container'];
    case 'tab-dropdown':
      return ['TabDropdown', 'tabDropdown: TabDropdown'];
    case 'actions':
      return ['HeaderActions', 'actions: HeaderActions'];
    default:
      return;
  }
}
