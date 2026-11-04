'use client';
import { usePathname } from 'fumadocs-core/framework';
import Link from 'fumadocs-core/link';
import { useI18n } from '@/contexts/i18n';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/utils/cn';
import { useTranslations } from '@fuma-translate/react';
import { MessageCircleIcon } from 'lucide-react';
import { type FC, type ComponentProps, type ReactNode, createContext, useState } from 'react';
import { isLinkItemActive, type AIChatOptions, type BaseLayoutProps, type LinkItemType } from '.';
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

export const AIChatContext = createContext<AIChatOptions | undefined>(undefined);

/**
 * The AI chat of docs layouts without an `aiChat` prop, for integrations that don't own the layout.
 *
 * The docs and notebook layouts add a floating button that toggles it, others have their own.
 */
export function AIChatOptionsProvider({
  value,
  children,
}: {
  value: AIChatOptions;
  children: ReactNode;
}) {
  return <AIChatContext value={value}>{children}</AIChatContext>;
}

export function AIChatTrigger({ open, onOpenChange }: AIChatOptions) {
  const t = useTranslations();

  return (
    <button
      type="button"
      aria-expanded={open}
      className={cn(
        buttonVariants({ variant: 'secondary' }),
        'fixed inset-e-[calc(--spacing(4)+var(--removed-body-scroll-bar-size,0px))] bottom-4 z-20 gap-2 rounded-2xl text-fd-muted-foreground shadow-lg transition-[translate,opacity] motion-reduce:transition-none',
        open && 'translate-y-10 opacity-0',
      )}
      inert={open}
      onClick={() => onOpenChange(!open)}
    >
      <MessageCircleIcon aria-hidden className="size-4.5" />
      {t('Ask AI', { note: 'AI chat button' })}
    </button>
  );
}

/**
 * The place of AI chat, docked by the layout on wide viewports, and floating on smaller ones.
 */
export function AIChatPanel({
  open,
  className,
  children,
}: {
  open: boolean;
  className?: string;
  children: ReactNode;
}) {
  // mount the chat once opened
  const [mounted, setMounted] = useState(open);
  if (open && !mounted) setMounted(true);

  return (
    <aside
      className={cn(
        'z-40 overflow-clip bg-fd-card text-fd-card-foreground layout:[--fd-ai-chat-width:min(--spacing(100),100vw---spacing(4))] transition-[width,margin,translate] duration-300 ease-in-out motion-reduce:transition-none max-xl:fixed max-xl:inset-y-2 max-xl:end-2 max-xl:w-(--fd-ai-chat-width) max-xl:rounded-2xl max-xl:border max-xl:shadow-xl',
        open
          ? 'w-(--fd-ai-chat-width)'
          : // visible at once when opened, so it can take focus; hidden only after closing
            'invisible w-0 transition-[width,margin,translate,visibility] max-xl:translate-x-[calc(100%+--spacing(2))] rtl:max-xl:-translate-x-[calc(100%+--spacing(2))]',
        className,
      )}
    >
      {/* fixed width while resizing */}
      <div className="flex flex-col size-full xl:w-(--fd-ai-chat-width)">{mounted && children}</div>
    </aside>
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
    useBaseSlots(options: BaseLayoutProps): {
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
