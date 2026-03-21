import { cancel, group, intro, log, outro, select } from '@clack/prompts';
import picocolors from 'picocolors';
import { install } from '@/commands/add';
import type { RegistryClient } from '@/registry/client';
import { ComponentInstaller } from '@/registry/installer';
import { UIRegistries } from '@/commands/shared';
import { pluginPreserveLayouts } from '@/registry/plugins/preserve';

interface TargetInfo {
  target: string[];
  id: string;
  print?: () => void;
}

interface SlotPrintInfo {
  at: string;
  layoutId: string;
  name: string;
  isPage: boolean;
}

export async function customise(client: RegistryClient) {
  intro(picocolors.bgBlack(picocolors.whiteBright('Customise Fumadocs UI')));
  const config = client.config;
  const installer = new ComponentInstaller(client, {
    plugins: [pluginPreserveLayouts()],
  });
  const registry = UIRegistries[config.uiLibrary];
  const info = await client.createLinkedRegistryClient(registry).fetchRegistryInfo();

  const result = await group(
    {
      layout: (): Promise<TargetInfo | symbol> =>
        select({
          message: 'What do you want to customise?',
          options: [
            {
              label: 'Docs Layout',
              value: {
                id: 'docs',
                target: [`${registry}/layouts/docs`],
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
                target: [`${registry}/layouts/notebook`],
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
                target: [`${registry}/layouts/flux`],
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
                target: [`${registry}/layouts/home`],
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
          message: 'Which part do you want to customise?',
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
                target: ['layouts/docs-min'],
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
                    target: [`${registry}/${index.name}`],
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
                  target: [`${registry}/${index.name}`],
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

  const target = result.target as TargetInfo;
  await install(target.target, installer);
  target.print?.();

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
