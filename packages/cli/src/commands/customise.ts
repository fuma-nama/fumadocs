import { cancel, group, intro, log, outro, select } from '@clack/prompts';
import picocolors from 'picocolors';
import type { Target } from '@/commands/add';
import { UIRegistries } from '@/commands/shared';
import { LoadedConfig } from '@/config';
import { RegistryConnector } from 'fuma-cli/registry/connector';
import { FumadocsComponentInstaller } from '@/registry/installer';

interface TargetInfo {
  targets: Target[];
  id: string;
  print?: () => void;
}

interface SlotPrintInfo {
  at: string;
  layoutId: string;
  name: string;
  isPage: boolean;
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
                print() {
                  printLayout(
                    ['fumadocs-ui/layouts/docs', '@/layouts/docs'],
                    ['fumadocs-ui/layouts/docs/page', '@/layouts/docs/page'],
                  );
                },
              },
              hint: 'the default docs layout',
            },
            {
              label: 'Notebook Layout',
              value: {
                id: 'notebook',
                targets: [{ subRegistry, name: 'layouts/notebook' }],
                print() {
                  printLayout(
                    ['fumadocs-ui/layouts/notebook', '@/layouts/notebook'],
                    ['fumadocs-ui/layouts/notebook/page', '@/layouts/notebook/page'],
                  );
                },
              },
              hint: 'a more compact version of docs layout',
            },
            {
              label: 'Flux Layout',
              value: {
                id: 'flux',
                targets: [{ subRegistry, name: 'layouts/flux' }],
                print() {
                  printLayout(
                    ['fumadocs-ui/layouts/flux', '@/layouts/flux'],
                    ['fumadocs-ui/layouts/flux/page', '@/layouts/flux/page'],
                  );
                },
              },
              hint: 'the experimental variant of docs layout',
            },
            {
              label: 'Home Layout',
              value: {
                id: 'home',
                targets: [{ subRegistry, name: 'layouts/home' }],
                print() {
                  printLayout(['fumadocs-ui/layouts/home', `@/layouts/home`]);
                },
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
                print() {
                  printLayout(
                    ['fumadocs-ui/layouts/docs', '@/layouts/docs'],
                    ['fumadocs-ui/layouts/docs/page', '@/layouts/docs/page'],
                  );
                },
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

  targetInfo.print?.();

  outro(picocolors.bold('Have fun!'));
}

function printLayout(...maps: [from: string, to: string][]) {
  intro(picocolors.bold('What is Next?'));

  log.info(
    [
      'You can check the installed layouts in `layouts` folder.',
      picocolors.dim('---'),
      'Open your `layout.tsx` files, replace the imports of components:',
      ...maps.map(([from, to]) => picocolors.greenBright(`"${from}" -> "${to}"`)),
    ].join('\n'),
  );
}

function printSlot({ at, layoutId, name, isPage }: SlotPrintInfo) {
  intro(picocolors.bold('What is Next?'));

  log.info(`You can check the installed layout slot in "${at}".`);

  const code = getSlotCode({ at, layoutId, name, isPage });

  if (code) {
    if (isPage) {
      log.info(
        `${picocolors.bold('At your <DocsPage /> component, update your "slots" prop:')}\n\n${code}`,
      );
    } else {
      log.info(
        `${picocolors.bold('At your <DocsLayout /> component, update your "slots" prop:')}\n\n${code}`,
      );
    }
  }
}

function getSlotCode({ at, layoutId, name, isPage }: SlotPrintInfo): string | undefined {
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
