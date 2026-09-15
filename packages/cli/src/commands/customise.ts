import fs from 'node:fs/promises';
import path from 'node:path';
import { cancel, group, intro, log, outro, select } from '@clack/prompts';
import picocolors from 'picocolors';
import { parseSourceFile } from '@/codemod';
import { frameworks } from '@/project';
import type { Target } from '@/commands/add';
import { UIRegistries } from '@/commands/shared';
import { LoadedConfig } from '@/config';
import { RegistryConnector } from 'fuma-cli/registry/connector';
import { FumadocsComponentInstaller } from '@/registry/installer';

interface TargetInfo {
  targets: Target[];
  id: string;
  print?: () => void | Promise<void>;
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

  const installer = new FumadocsComponentInstaller(connector, config);
  const subRegistry = UIRegistries[config.uiLibrary];
  const info = await connector.fetchRegistryInfo(subRegistry);

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
                print: () =>
                  printLayout(
                    config,
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
                print: () =>
                  printLayout(
                    config,
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
                print: () =>
                  printLayout(
                    config,
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
                print: () =>
                  printLayout(
                    config,
                    ['fumadocs-ui/layouts/glass', '@/layouts/glass'],
                    ['fumadocs-ui/layouts/glass/page', '@/layouts/glass/page'],
                  ),
              },
              hint: 'a docs layout with floating, translucent panels',
            },
            {
              label: 'Home Layout',
              value: {
                id: 'home',
                targets: [{ subRegistry, name: 'layouts/home' }],
                print: () => printLayout(config, ['fumadocs-ui/layouts/home', '@/layouts/home']),
              },
              hint: 'the layout for other non-docs pages',
            },
          ],
        }),
      target: (v): Promise<TargetInfo | symbol> => {
        const selected = v.results.layout!;
        if (selected.id === 'home') return Promise.resolve(selected);

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
                targets: [{ name: 'layouts/docs-min' }],
                print: () =>
                  printLayout(
                    config,
                    ['fumadocs-ui/layouts/docs', '@/layouts/docs'],
                    ['fumadocs-ui/layouts/docs/page', '@/layouts/docs/page'],
                  ),
              },
            },
            ...info.unlistedIndexes.flatMap((index) => {
              const prefix = `slots/${selected.id}`;
              if (!index.name.startsWith(prefix)) return [];
              let name = index.name.slice(prefix.length + 1);

              if (name.startsWith('page/')) {
                name = name.slice('page/'.length);

                return {
                  label: `Page: ${name}`,
                  hint: "only replace a part of layout's page, useful for adjusting details",
                  value: {
                    id: index.name,
                    targets: [{ subRegistry, name: index.name }],
                    print() {
                      printSlot({
                        at: `@/layouts/${selected.id}/page/slots/${name}`,
                        layoutId: selected.id,
                        name,
                        isPage: true,
                        uiLibrary: config.uiLibrary,
                      });
                    },
                  } as TargetInfo,
                };
              }

              return {
                label: `Layout: ${name}`,
                hint: 'only replace a part of layout, useful for adjusting details',
                value: {
                  id: index.name,
                  targets: [{ subRegistry, name: index.name }],
                  print() {
                    printSlot({
                      at: `@/layouts/${selected.id}/slots/${name}`,
                      layoutId: selected.id,
                      name,
                      isPage: false,
                      uiLibrary: config.uiLibrary,
                    });
                  },
                } as TargetInfo,
              };
            }),
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

  await targetInfo.print?.();

  outro(picocolors.bold('Have fun!'));
}

/** point the imports of route files at the installed layouts */
export async function rewriteLayoutImports(config: LoadedConfig, map: Map<string, string>) {
  const dir = path.join(config.baseDir, frameworks[config.framework].routesDir);
  const entries = await fs.readdir(dir, { recursive: true, withFileTypes: true }).catch(() => []);
  const updated: string[] = [];

  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith('.tsx')) continue;
    const file = path.join(entry.parentPath, entry.name);
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

async function printLayout(config: LoadedConfig, ...maps: [from: string, to: string][]) {
  intro(picocolors.bold('What is Next?'));
  const updated = await rewriteLayoutImports(config, new Map(maps));

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

  const code = getSlotCode({ at, layoutId, name, isPage, uiLibrary });

  if (code) {
    const layoutComponent = layoutId === 'glass' ? '<GlassLayout />' : '<DocsLayout />';

    if (isPage) {
      log.info(
        `${picocolors.bold('At your <DocsPage /> component, update your "slots" prop:')}\n\n${code}`,
      );
    } else {
      log.info(
        `${picocolors.bold(`At your ${layoutComponent} component, update your "slots" prop:`)}\n\n${code}`,
      );
    }
  }
}

function getSlotCode({ at, layoutId, name, isPage, uiLibrary }: SlotPrintInfo): string | undefined {
  if (layoutId === 'glass') {
    // Glass layout wires its page slots directly, only layout-level slots are swappable.
    if (isPage) return;

    switch (name) {
      case 'header':
        return `import { Header } from '${at}';

return (
  <GlassLayout
    slots={{
      header: Header,
    }}
  >
    ...
  </GlassLayout>
);`;
      case 'sidebar': {
        // `sidebar` slot file holds the whole sidebar system (desktop, mobile drawer, provider).
        // Base UI additionally exposes a `drawerHandle` for its swipeable drawer.
        const imports = ['Sidebar', 'SidebarDrawer', 'SidebarProvider', 'useSidebar'];
        if (uiLibrary === 'base-ui') imports.push('drawerHandle');

        return `import { ${imports.join(', ')} } from '${at}';

return (
  <GlassLayout
    slots={{
      sidebar: {
        main: Sidebar,
        provider: SidebarProvider,
        use: useSidebar,
        drawer: SidebarDrawer,${uiLibrary === 'base-ui' ? '\n        drawerHandle,' : ''}
      },
    }}
  >
    ...
  </GlassLayout>
);`;
      }
      default:
        return;
    }
  }

  if (isPage) {
    switch (name) {
      case 'toc':
        if (layoutId === 'flux') {
          return `import { TOCProvider, TOC } from '${at}';

return (
  <DocsPage
    slots={{
      toc: {
        provider: TOCProvider,
        main: TOC,
      },
    }}
  >
    ...
  </DocsPage>
);`;
        }

        return `import { TOCProvider, TOC, TOCPopover } from '${at}';

return (
  <DocsPage
    slots={{
      toc: {
        provider: TOCProvider,
        main: TOC,
        popover: TOCPopover,
      },
    }}
  >
    ...
  </DocsPage>
);`;
      case 'container': {
        return `import { Container } from '${at}';

return (
  <DocsPage
    slots={{
      container: Container,
    }}
  >
    ...
  </DocsPage>
);`;
      }
      case 'footer': {
        return `import { Footer } from '${at}';

return (
  <DocsPage
    slots={{
      footer: Footer,
    }}
  >
    ...
  </DocsPage>
);`;
      }
      case 'breadcrumb': {
        return `import { Breadcrumb } from '${at}';

return (
  <DocsPage
    slots={{
      breadcrumb: Breadcrumb,
    }}
  >
    ...
  </DocsPage>
);`;
      }
      default:
        return;
    }
  }

  switch (name) {
    case 'sidebar': {
      if (layoutId === 'notebook') {
        return `import {
  SidebarProvider,
  Sidebar,
  SidebarTrigger,
  SidebarCollapseTrigger,
  useSidebar,
} from '${at}';

return (
  <DocsLayout
    slots={{
      sidebar: {
        provider: SidebarProvider,
        root: Sidebar,
        trigger: SidebarTrigger,
        collapseTrigger: SidebarCollapseTrigger,
        useSidebar: useSidebar,
      },
    }}
  >
    ...
  </DocsLayout>
);`;
      }

      return `import { SidebarProvider, Sidebar, SidebarTrigger, useSidebar } from '${at}';

return (
  <DocsLayout
    slots={{
      sidebar: {
        provider: SidebarProvider,
        root: Sidebar,
        trigger: SidebarTrigger,
        useSidebar: useSidebar,
      },
    }}
  >
    ...
  </DocsLayout>
);`;
    }
    case 'container': {
      return `import { Container } from '${at}';

return (
  <DocsLayout
    slots={{
      container: Container,
    }}
  >
    ...
  </DocsLayout>
);`;
    }
    case 'header': {
      return `import { Header } from '${at}';

return (
  <DocsLayout
    slots={{
      header: Header,
    }}
  >
    ...
  </DocsLayout>
);`;
    }
    case 'tab-dropdown': {
      return `import { TabDropdown } from '${at}';

return (
  <DocsLayout
    slots={{
      tabDropdown: TabDropdown,
    }}
  >
    ...
  </DocsLayout>
);`;
    }
    default:
      return;
  }
}
