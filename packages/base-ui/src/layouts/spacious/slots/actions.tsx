'use client';
import { Menu } from '@base-ui/react/menu';
import { useTranslations } from '@fuma-translate/react';
import Link from 'fumadocs-core/link';
import {
  ArrowUpRightIcon,
  CheckIcon,
  ChevronDownIcon,
  ChevronsUpDownIcon,
  EllipsisIcon,
  LanguagesIcon,
  MessageCircleIcon,
  MonitorIcon,
  MoonIcon,
  SunIcon,
  SunMoonIcon,
} from 'lucide-react';
import { useMediaQuery } from 'fumadocs-core/utils/use-media-query';
import { useTheme } from 'next-themes';
import type { ComponentProps, CSSProperties, MouseEvent } from 'react';
import { flushSync } from 'react-dom';
import { buttonVariants } from '@/components/ui/button';
import { useI18n } from '@/contexts/i18n';
import { LinkItem } from '@/layouts/shared';
import { cn } from '@/utils/cn';
import { useSpaciousLayout } from '..';

const popupClass =
  'flex flex-col max-h-(--available-height) overflow-y-auto rounded-2xl border bg-fd-popover text-sm text-fd-popover-foreground shadow-lg outline-none origin-(--transform-origin) transition-[opacity,scale] duration-150 ease-[cubic-bezier(0.22,1,0.36,1)] data-starting-style:opacity-0 data-starting-style:scale-95 data-ending-style:opacity-0 data-ending-style:scale-[0.97] data-ending-style:duration-100 motion-reduce:transition-none';

const itemClass =
  'flex w-full min-h-9 items-center gap-3 rounded-lg px-2.5 py-1.5 text-start outline-none transition-colors duration-100 data-highlighted:bg-fd-accent data-highlighted:text-fd-accent-foreground [&_svg]:size-4 [&_svg]:shrink-0';

function IconLinks({ className }: { className?: string }) {
  const { menuItems } = useSpaciousLayout();

  return menuItems.map(
    (item, i) =>
      item.type === 'icon' && (
        <LinkItem
          key={i}
          item={item}
          aria-label={item.label}
          className={cn(buttonVariants({ variant: 'ghost', size: 'icon-sm' }), className)}
        >
          {item.icon}
        </LinkItem>
      ),
  );
}

/** the top right of page, the language switcher and icon links are moved into `OptionsMenu` on smaller viewports */
export function HeaderActions({ className, ...props }: ComponentProps<'div'>) {
  const { slots } = useSpaciousLayout();

  return (
    <div
      className={cn('flex items-center gap-0.5 rounded-lg bg-fd-background', className)}
      {...props}
    >
      {slots.languageSelect && (
        <slots.languageSelect.root className="h-7.5 gap-1.5 px-2 text-fd-muted-foreground max-lg:hidden">
          <LanguagesIcon className="size-4" />
          <slots.languageSelect.text />
          <ChevronDownIcon className="size-3.5 transition-transform in-data-popup-open:rotate-180" />
        </slots.languageSelect.root>
      )}
      <IconLinks className="text-fd-muted-foreground max-lg:hidden" />
      <OptionsMenu />
    </div>
  );
}

/** page-level options: AI chat, theme, language and icon links */
function OptionsMenu() {
  const {
    props: { aiChat },
    slots,
    menuItems,
  } = useSpaciousLayout();
  const t = useTranslations();
  const iconLinks = menuItems.filter((item) => item.type === 'icon');
  const hasOptions = Boolean(aiChat || slots.themeSwitch);
  // the language switcher and icon links are only in header on wider viewports
  const compact = useMediaQuery('(width < 64rem)');
  if (!hasOptions && !slots.languageSelect && iconLinks.length === 0) return;

  return (
    <Menu.Root>
      <Menu.Trigger
        aria-label={t('Options', { note: 'aria-label' })}
        className={cn(
          buttonVariants({ variant: 'ghost', size: 'icon-sm' }),
          'text-fd-muted-foreground data-popup-open:bg-fd-accent data-popup-open:text-fd-accent-foreground',
          !hasOptions && 'lg:hidden',
        )}
      >
        <EllipsisIcon />
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner align="end" sideOffset={8} positionMethod="fixed" className="z-50">
          <Menu.Popup className={cn(popupClass, 'w-64 divide-y')}>
            {aiChat && (
              <div className="p-1">
                <Menu.Item className={itemClass} onClick={() => aiChat.onOpenChange(!aiChat.open)}>
                  <MessageCircleIcon className="text-fd-muted-foreground" />
                  {t('Ask AI', { note: 'AI chat button' })}
                </Menu.Item>
              </div>
            )}
            {slots.themeSwitch && (
              <div className="flex items-center gap-3 py-2 ps-3.5 pe-2">
                <SunMoonIcon className="size-4 text-fd-muted-foreground" />
                <span aria-hidden className="flex-1">
                  {t('Theme', { note: 'site menu' })}
                </span>
                <ThemeSegments />
              </div>
            )}
            {compact && slots.languageSelect && <Languages />}
            {compact && iconLinks.length > 0 && (
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

function Languages() {
  const { locale, locales = [], onChange } = useI18n();
  const t = useTranslations({ note: 'language switcher' });

  return (
    <div className="p-1">
      <Menu.SubmenuRoot>
        <Menu.SubmenuTrigger className={cn(itemClass, 'data-popup-open:bg-fd-accent')}>
          <LanguagesIcon className="text-fd-muted-foreground" />
          <span className="flex-1 whitespace-nowrap">{t('Language')}</span>
          <span className="truncate text-fd-muted-foreground">
            {locales.find((item) => item.locale === locale)?.name}
          </span>
          <ChevronsUpDownIcon className="size-3.5! text-fd-muted-foreground" />
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

/** theme options with a sliding thumb */
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
      onValueChange={(value: string) =>
        document.startViewTransition?.(() => flushSync(() => setTheme(value))) ?? setTheme(value)
      }
      aria-label={t('Toggle Theme', { note: 'aria-label' })}
      className="relative flex rounded-full border bg-fd-secondary p-0.5"
    >
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
          className="relative flex items-center justify-center size-7 rounded-full text-fd-muted-foreground outline-none transition-colors duration-150 hover:text-fd-foreground focus-visible:ring-2 focus-visible:ring-fd-ring data-checked:text-fd-foreground data-highlighted:text-fd-foreground data-highlighted:not-data-checked:bg-fd-accent [&_svg]:size-3.5"
          onClick={(e) => onPick(e, turn)}
        >
          <Icon />
        </Menu.RadioItem>
      ))}
    </Menu.RadioGroup>
  );
}
