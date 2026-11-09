'use client';
import type { ComponentProps } from 'react';
import { Menu } from '@base-ui/react/menu';
import Link from 'fumadocs-core/link';
import { CheckIcon, ChevronsUpDownIcon, SidebarIcon } from 'lucide-react';
import { AIChatPanel, useAIChat } from '@/components/inkeep/search';
import { SidebarTrigger } from 'fumadocs-ui/components/sidebar/base';
import { buttonVariants } from 'fumadocs-ui/components/ui/button';
import { useTabsGroups } from 'fumadocs-ui/contexts/tree';
import { DocsLayout, type DocsLayoutProps, useSpaciousLayout } from 'fumadocs-ui/layouts/spacious';

export function ClientSpaciousLayout(props: DocsLayoutProps) {
  const { open, setOpen } = useAIChat();

  return (
    <DocsLayout
      {...props}
      slots={{ header: Header }}
      aiChat={{ open, onOpenChange: setOpen, panel: <AIChatPanel /> }}
    />
  );
}

/** the mobile navbar, with the framework of the page next to the title */
function Header(props: ComponentProps<'header'>) {
  const {
    slots,
    props: { tabs },
  } = useSpaciousLayout();
  const group = useTabsGroups(tabs).find((group) => group.active?.root === 'framework');
  const selected = group?.options.find((tab) => tab.$folder?.$id === group.active?.$id);

  return (
    <header
      id="nd-subnav"
      className="sticky top-(--fd-banner-height,0px) z-30 [grid-area:header] flex items-center gap-2.5 h-(--fd-header-height) ps-4 pe-2.5 bg-fd-card md:hidden"
      {...props}
    >
      <slots.navTitle className="inline-flex items-center font-semibold [&>span]:sr-only" />
      {group && selected && (
        <Menu.Root>
          <Menu.Trigger className="flex min-w-0 h-8 items-center gap-2 ps-2 pe-1.5 rounded-lg border bg-fd-secondary/50 text-sm font-medium outline-none transition-colors hover:bg-fd-accent focus-visible:ring-2 focus-visible:ring-fd-ring data-popup-open:bg-fd-accent [&_svg]:size-4 [&_svg]:shrink-0">
            {selected.icon}
            <span className="truncate">{selected.title}</span>
            <ChevronsUpDownIcon className="size-3.5! text-fd-muted-foreground" />
          </Menu.Trigger>
          <Menu.Portal>
            <Menu.Positioner align="start" sideOffset={8} alignOffset={-4} className="z-50">
              <Menu.Popup className="flex flex-col min-w-56 p-1 rounded-2xl border bg-fd-popover text-sm text-fd-popover-foreground shadow-lg outline-none origin-(--transform-origin) transition-[opacity,scale] duration-150 ease-[cubic-bezier(0.22,1,0.36,1)] data-starting-style:opacity-0 data-starting-style:scale-95 data-ending-style:opacity-0 data-ending-style:scale-97 data-ending-style:duration-100 motion-reduce:transition-none">
                {group.options.map((tab) => (
                  <Menu.LinkItem
                    key={tab.url}
                    closeOnClick
                    render={<Link href={tab.url} />}
                    className="flex items-center gap-3 rounded-lg px-[calc(--spacing(2.5)-1px)] py-2 font-medium outline-none transition-colors duration-100 data-highlighted:bg-fd-accent data-highlighted:text-fd-accent-foreground [&_svg]:size-4 [&_svg]:shrink-0"
                  >
                    {tab.icon}
                    <span className="flex-1">{tab.title}</span>
                    {tab === selected && <CheckIcon className="text-fd-primary" />}
                  </Menu.LinkItem>
                ))}
              </Menu.Popup>
            </Menu.Positioner>
          </Menu.Portal>
        </Menu.Root>
      )}
      <div className="flex-1" />
      {slots.searchTrigger && <slots.searchTrigger.sm hideIfDisabled className="p-2" />}
      <SidebarTrigger
        className={buttonVariants({ variant: 'ghost', size: 'icon-sm', className: 'p-2' })}
      >
        <SidebarIcon />
      </SidebarTrigger>
    </header>
  );
}
