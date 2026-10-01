'use client';
import { Menu } from '@base-ui/react/menu';
import { useTranslations } from '@fuma-translate/react';
import { usePathname } from 'fumadocs-core/framework';
import Link from 'fumadocs-core/link';
import {
  ArrowUpRightIcon,
  CheckIcon,
  ChevronRightIcon,
  ChevronsUpDownIcon,
  LanguagesIcon,
  MonitorIcon,
  MoonIcon,
  Settings2Icon,
  SunIcon,
} from 'lucide-react';
import { useTheme } from 'next-themes';
import type { CSSProperties, MouseEvent, ReactNode } from 'react';
import { flushSync } from 'react-dom';
import { useI18n } from '@/contexts/i18n';
import { useTabsGroups, useTreePath } from '@/contexts/tree';
import { isLayoutTabActive, type LayoutTab } from '@/layouts/shared';
import { cn } from '@/utils/cn';
import { useSpaciousLayout } from '..';

const popupClass =
  'flex flex-col max-h-(--available-height) overflow-y-auto rounded-2xl border bg-fd-popover text-sm text-fd-popover-foreground shadow-lg outline-none divide-y origin-(--transform-origin) transition-[opacity,scale] duration-150 ease-[cubic-bezier(0.22,1,0.36,1)] data-starting-style:opacity-0 data-starting-style:scale-95 data-ending-style:opacity-0 data-ending-style:scale-[0.97] data-ending-style:duration-100 motion-reduce:transition-none';

const itemClass =
  'flex w-full min-h-8 items-center gap-2.5 rounded-lg px-2 py-1.5 text-start outline-none transition-colors duration-100 data-highlighted:bg-fd-accent data-highlighted:text-fd-accent-foreground [&_svg]:size-4 [&_svg]:shrink-0';

const labelClass = 'px-2 pt-1.5 pb-1 text-xs text-fd-muted-foreground';

const railHidden = 'transition-opacity duration-200 group-data-[collapsed=true]/sidebar:opacity-0';

export function SiteMenu() {
  const {
    props: { tabs },
    slots,
    menuItems,
  } = useSpaciousLayout();
  const t = useTranslations({ note: 'site menu' });
  const pathname = usePathname();
  const path = useTreePath();
  const options =
    useTabsGroups(tabs).findLast((group) => typeof group.active?.root !== 'string')?.options ?? [];
  const selected = options.findLast((tab) => isLayoutTabActive(tab, path, pathname));
  const iconLinks = menuItems.filter((item) => item.type === 'icon');

  if (options.length === 0 && !slots.themeSwitch && !slots.languageSelect && iconLinks.length === 0)
    return;

  return (
    <Menu.Root>
      <Menu.Trigger className="flex w-full items-center gap-2.5 overflow-hidden rounded-lg pe-2 text-start outline-none transition-[width,background-color] hover:bg-fd-accent/60 focus-visible:ring-2 focus-visible:ring-fd-ring data-popup-open:bg-fd-accent group-data-[collapsed=true]/sidebar:w-8">
        <TabBadge fallback={<Settings2Icon />}>{selected}</TabBadge>
        <span className={cn('flex-1 truncate font-medium', railHidden)}>
          {selected?.title ?? t('Settings')}
        </span>
        <ChevronsUpDownIcon
          className={cn('size-3.5 shrink-0 text-fd-muted-foreground', railHidden)}
        />
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner
          side="top"
          align="start"
          sideOffset={8}
          positionMethod="fixed"
          className="z-50"
        >
          <Menu.Popup className={cn(popupClass, 'w-(--anchor-width) min-w-60')}>
            {options.length > 0 && (
              <Menu.Group className="flex flex-col p-1">
                <Menu.GroupLabel className={labelClass}>{t('Sections')}</Menu.GroupLabel>
                {options.map((tab, i) => {
                  if (tab.unlisted && tab !== selected) return;

                  return (
                    <Menu.LinkItem
                      key={i}
                      closeOnClick
                      render={<Link href={tab.url} {...tab.props} />}
                      className={cn(itemClass, tab.props?.className)}
                    >
                      <TabBadge>{tab}</TabBadge>
                      <span className="flex flex-col flex-1 min-w-0">
                        <span className="truncate font-medium">{tab.title}</span>
                        {tab.description && (
                          <span className="truncate text-xs text-fd-muted-foreground">
                            {tab.description}
                          </span>
                        )}
                      </span>
                      {tab === selected && <CheckIcon className="text-fd-primary" />}
                    </Menu.LinkItem>
                  );
                })}
              </Menu.Group>
            )}
            {slots.themeSwitch && <ThemeSegments />}
            {slots.languageSelect && <Languages />}
            {iconLinks.length > 0 && (
              <div className="flex flex-col p-1">
                {iconLinks.map((item, i) => (
                  <Menu.LinkItem
                    key={i}
                    closeOnClick
                    render={<Link href={item.url} external={item.external} />}
                    className={itemClass}
                  >
                    <span className="flex items-center justify-center size-4">{item.icon}</span>
                    <span className="flex-1">{item.text}</span>
                    {item.external && <ArrowUpRightIcon className="text-fd-muted-foreground" />}
                  </Menu.LinkItem>
                ))}
              </div>
            )}
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}

function TabBadge({ children: tab, fallback }: { children?: LayoutTab; fallback?: ReactNode }) {
  return (
    <span className="flex items-center justify-center shrink-0 size-8 rounded-lg border bg-fd-muted text-sm font-medium text-fd-muted-foreground [&_svg]:size-4">
      {tab ? (tab.icon ?? (typeof tab.title === 'string' ? tab.title.charAt(0) : null)) : fallback}
    </span>
  );
}

function Languages() {
  const { locale, locales = [], onChange } = useI18n();
  const t = useTranslations({ note: 'language switcher' });

  return (
    <div className="p-1">
      <Menu.SubmenuRoot>
        <Menu.SubmenuTrigger className={cn(itemClass, 'data-popup-open:bg-fd-accent')}>
          <LanguagesIcon className="text-fd-muted-foreground" />
          <span className="flex-1">{t('Choose a language')}</span>
          <span className="text-fd-muted-foreground">
            {locales.find((item) => item.locale === locale)?.name}
          </span>
          <ChevronRightIcon className="size-3.5! text-fd-muted-foreground rtl:rotate-180" />
        </Menu.SubmenuTrigger>
        <Menu.Portal>
          <Menu.Positioner sideOffset={8} alignOffset={-4} positionMethod="fixed" className="z-50">
            <Menu.Popup className={cn(popupClass, 'min-w-44 p-1')}>
              <Menu.RadioGroup value={locale} onValueChange={(value) => onChange?.(value)}>
                {locales.map((item) => (
                  <Menu.RadioItem
                    key={item.locale}
                    value={item.locale}
                    closeOnClick
                    className={itemClass}
                  >
                    <span className="flex-1">{item.name}</span>
                    <Menu.RadioItemIndicator>
                      <CheckIcon className="text-fd-primary" />
                    </Menu.RadioItemIndicator>
                  </Menu.RadioItem>
                ))}
              </Menu.RadioGroup>
            </Menu.Popup>
          </Menu.Positioner>
        </Menu.Portal>
      </Menu.SubmenuRoot>
    </div>
  );
}

const themes = [
  // the angle each icon turns in from when picked
  ['system', MonitorIcon, '0deg'],
  ['light', SunIcon, '-90deg'],
  ['dark', MoonIcon, '40deg'],
] as const;

function ThemeSegments() {
  const { theme, setTheme } = useTheme();
  const t = useTranslations({ note: 'theme switcher' });
  const labels = {
    light: t('Light', { note: 'aria-label' }),
    dark: t('Dark', { note: 'aria-label' }),
    system: t('System', { note: 'aria-label' }),
  };
  const index = themes.findIndex(([key]) => key === theme);

  function onPick(e: MouseEvent<HTMLElement>, turn: string) {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    e.currentTarget.firstElementChild?.animate(
      [
        { rotate: turn, scale: 0.6 },
        { rotate: '0deg', scale: 1 },
      ],
      { duration: 520, easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)' },
    );
  }

  return (
    <Menu.RadioGroup
      value={theme}
      onValueChange={(value: string) => {
        if (document.startViewTransition)
          document.startViewTransition(() => flushSync(() => setTheme(value)));
        else setTheme(value);
      }}
      className="flex items-center justify-between gap-3 py-2 ps-3 pe-2"
    >
      <Menu.GroupLabel>{t('Theme', { note: 'site menu' })}</Menu.GroupLabel>
      <div className="relative flex rounded-full border bg-fd-secondary p-0.5">
        {index !== -1 && (
          <span
            aria-hidden
            className="absolute top-0.5 start-0.5 size-7 rounded-full bg-fd-background shadow-sm ring-1 ring-fd-border [translate:calc(var(--index)*100%)_0] rtl:[translate:calc(var(--index)*-100%)_0] transition-[translate] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none"
            style={{ '--index': index } as CSSProperties}
          />
        )}
        {themes.map(([key, Icon, turn]) => (
          <Menu.RadioItem
            key={key}
            value={key}
            aria-label={labels[key]}
            className="relative flex items-center justify-center size-7 rounded-full text-fd-muted-foreground outline-none transition-colors duration-150 data-checked:text-fd-foreground data-highlighted:text-fd-foreground data-highlighted:not-data-checked:bg-fd-accent [&_svg]:size-3.5"
            onClick={(e) => onPick(e, turn)}
          >
            <Icon />
          </Menu.RadioItem>
        ))}
      </div>
    </Menu.RadioGroup>
  );
}
