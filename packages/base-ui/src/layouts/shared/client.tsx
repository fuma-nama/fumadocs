'use client';
import { usePathname } from 'fumadocs-core/framework';
import Link from 'fumadocs-core/link';
import { useI18n } from '@/contexts/i18n';
import type { FC, ComponentProps } from 'react';
import { isLinkItemActive, type BaseLayoutProps, type LinkItemType } from '.';
import {
  type LanguageSelectProps,
  type LanguageSelectTextProps,
  LanguageSelect,
  LanguageSelectText,
} from './slots/language-select';
import {
  type SearchTriggerProps,
  type FullSearchTriggerProps,
  SearchTrigger,
  FullSearchTrigger,
} from './slots/search-trigger';
import { type ThemeSwitchProps, ThemeSwitch } from './slots/theme-switch';

export function LinkItem({
  ref,
  item,
  ...props
}: Omit<ComponentProps<'a'>, 'href'> & { item: Extract<LinkItemType, { url: string }> }) {
  const pathname = usePathname();
  const active = isLinkItemActive(item, pathname);

  return (
    <Link ref={ref} href={item.url} external={item.external} {...props} data-active={active}>
      {props.children}
    </Link>
  );
}

export interface BaseSlots {
  navTitle: FC<ComponentProps<'a'>>;
  themeSwitch: FC<ThemeSwitchProps> | false;
  searchTrigger:
    | {
        sm: FC<SearchTriggerProps>;
        full: FC<FullSearchTriggerProps>;
      }
    | false;
  languageSelect:
    | {
        root: FC<LanguageSelectProps>;
        text: FC<LanguageSelectTextProps>;
      }
    | false;
}

export interface BaseSlotsProps<P extends BaseLayoutProps = BaseLayoutProps> extends Pick<
  P,
  'nav'
> {
  themeSwitch: Omit<NonNullable<P['themeSwitch']>, 'enabled'>;
  searchToggle: Omit<NonNullable<P['searchToggle']>, 'enabled'>;
}

export function baseSlots({ useProps }: { useProps: () => BaseSlotsProps }) {
  function InlineThemeSwitch(props: ThemeSwitchProps) {
    const { themeSwitch } = useProps();
    if (themeSwitch.component) return themeSwitch.component;
    return <ThemeSwitch {...props} {...themeSwitch} />;
  }

  function InlineSearchTrigger(props: SearchTriggerProps) {
    const { searchToggle } = useProps();
    if (searchToggle.components?.sm) return searchToggle.components.sm;
    return <SearchTrigger {...props} {...searchToggle.sm} />;
  }

  function InlineSearchTriggerFull(props: FullSearchTriggerProps) {
    const { searchToggle } = useProps();
    if (searchToggle.components?.lg) return searchToggle.components.lg;
    return <FullSearchTrigger {...props} {...searchToggle.full} />;
  }

  function InlineNavTitle({ href: defaultUrl = '/', ...props }: ComponentProps<'a'>) {
    const { url = defaultUrl, title } = useProps().nav ?? {};

    if (typeof title === 'function') return title({ href: url, ...props });
    return (
      <Link href={url} {...props}>
        {title}
      </Link>
    );
  }

  return {
    useProvider(options: BaseLayoutProps): {
      baseSlots: BaseSlots;
      baseProps: BaseSlotsProps;
    } {
      const { locales = [] } = useI18n();
      const {
        nav,
        slots = {},
        i18n = locales.length > 1,
        searchToggle: { enabled: searchToggleEnabled = true, ...searchToggle } = {},
        themeSwitch: { enabled: themeSwitchEnabled = true, ...themeSwitch } = {},
      } = options;

      return {
        baseSlots: {
          navTitle: slots.navTitle ?? InlineNavTitle,
          themeSwitch: themeSwitchEnabled && (slots.themeSwitch ?? InlineThemeSwitch),
          languageSelect: i18n
            ? (slots.languageSelect ?? {
                root: LanguageSelect,
                text: LanguageSelectText,
              })
            : false,
          searchTrigger:
            searchToggleEnabled &&
            (slots.searchTrigger ?? {
              sm: InlineSearchTrigger,
              full: InlineSearchTriggerFull,
            }),
        },
        baseProps: {
          nav,
          searchToggle,
          themeSwitch,
        },
      };
    },
  };
}
