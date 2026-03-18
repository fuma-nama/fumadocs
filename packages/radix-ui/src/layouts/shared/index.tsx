import { useMemo, type ComponentProps, type ReactNode, type FC } from 'react';
import type { I18nConfig } from 'fumadocs-core/i18n';
import type { LinkItemType } from '@/utils/link-item';
import {
  FullSearchTrigger,
  SearchTrigger,
  type FullSearchTriggeProps,
  type SearchTriggerProps,
} from '../slots/search-toggle';
import { ThemeSwitch, type ThemeSwitchProps } from '../slots/theme-toggle';
import {
  LanguageSelect,
  LanguageSelectText,
  type LanguageSelectProps,
  type LanguageSelectTextProps,
} from '../slots/language-toggle';
import { useI18n } from '@/contexts/i18n';
import { NavTitle } from '../slots/nav-title';
import * as PageTree from 'fumadocs-core/page-tree';
import { isActive, normalize } from '@/utils/urls';

export interface NavOptions {
  enabled?: boolean;
  children?: ReactNode;
  title?: ReactNode | ((props: ComponentProps<'a'>) => ReactNode);

  /**
   * Redirect url of title
   * @defaultValue '/'
   */
  url?: string;

  /**
   * Use transparent background
   *
   * @defaultValue none
   */
  transparentMode?: 'always' | 'top' | 'none';

  /**
   * @deprecated use `slots.header` instead.
   */
  component?: ReactNode;
}

export interface BaseLayoutProps {
  /**
   * GitHub url
   */
  githubUrl?: string;
  links?: LinkItemType[];
  /**
   * navigation config
   */
  nav?: NavOptions;
  slots?: BaseSlots;
  children?: ReactNode;
  themeSwitch?: {
    enabled?: boolean;
    mode?: 'light-dark' | 'light-dark-system';

    /** @deprecated use `slots.themeSwitch` instead */
    component?: ReactNode;
  };

  searchToggle?: {
    enabled?: boolean;
    /** @deprecated use `slots.searchTrigger` instead */
    components?: {
      sm?: ReactNode;
      lg?: ReactNode;
    };
  };

  /**
   * @deprecated this is now optional for i18n setups, you can still customise language switch from `slots`.
   */
  i18n?: boolean | I18nConfig;
}

export interface BaseSlots {
  navTitle?: FC<ComponentProps<'a'>>;
  searchTrigger?: {
    sm: FC<SearchTriggerProps>;
    full: FC<FullSearchTriggeProps>;
  };
  languageSelect?: {
    root: FC<LanguageSelectProps>;
    text: FC<LanguageSelectTextProps>;
  };
  themeSwitch?: FC<ThemeSwitchProps>;
}

export type BaseSlotsProps<P extends BaseLayoutProps = BaseLayoutProps> = Pick<
  P,
  'themeSwitch' | 'searchToggle' | 'nav'
>;

export function baseSlots({ useProps }: { useProps: () => BaseSlotsProps }) {
  function InlineThemeSwitch(props: ThemeSwitchProps) {
    const { mode = props.mode, component } = useProps().themeSwitch ?? {};
    if (component) return component;
    return <ThemeSwitch {...props} mode={mode} />;
  }

  function InlineSearchTrigger(props: SearchTriggerProps) {
    const { components } = useProps().searchToggle ?? {};
    if (components?.sm) return components.sm;
    return <SearchTrigger {...props} />;
  }

  function InlineSearchTriggerFull(props: FullSearchTriggeProps) {
    const { components } = useProps().searchToggle ?? {};
    if (components?.lg) return components.lg;
    return <FullSearchTrigger {...props} />;
  }

  function InlineNavTitle(props: ComponentProps<'a'>) {
    const { url = props.href ?? '/', title } = useProps().nav ?? {};

    if (typeof title === 'function') return title(props);
    return (
      <NavTitle {...props} href={url}>
        {title}
      </NavTitle>
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
        searchToggle = {},
        themeSwitch = {},
      } = options;

      return {
        baseSlots: {
          navTitle: slots.navTitle ?? InlineNavTitle,
          themeSwitch:
            themeSwitch.enabled !== false ? (slots.themeSwitch ?? InlineThemeSwitch) : undefined,
          languageSelect: i18n
            ? (slots.languageSelect ?? {
                root: LanguageSelect,
                text: LanguageSelectText,
              })
            : undefined,
          searchTrigger:
            searchToggle.enabled !== false
              ? (slots.searchTrigger ?? {
                  sm: InlineSearchTrigger,
                  full: InlineSearchTriggerFull,
                })
              : undefined,
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

export interface LayoutTab {
  /**
   * Redirect URL of the folder, usually the index page
   */
  url: string;
  icon?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  unlisted?: boolean;
  props?: ComponentProps<'a'>;

  /**
   * bind to a page tree node.
   */
  $folder?: PageTree.Folder;

  /**
   * Detect from a list of urls (when not binded to page tree).
   */
  urls?: Set<string>;
}

export interface GetLayoutTabsOptions {
  transform?: (option: LayoutTab, node: PageTree.Folder) => LayoutTab | null;
}

const defaultTransform: GetLayoutTabsOptions['transform'] = (option, node) => {
  if (!node.icon) return option;

  return {
    ...option,
    icon: (
      <div className="size-full [&_svg]:size-full max-md:p-1.5 max-md:rounded-md max-md:border max-md:bg-fd-secondary">
        {node.icon}
      </div>
    ),
  };
};

export function getLayoutTabs(
  tree: PageTree.Root,
  { transform = defaultTransform }: GetLayoutTabsOptions = {},
): LayoutTab[] {
  const results: LayoutTab[] = [];

  function next(node: PageTree.Root | PageTree.Folder, unlisted?: boolean) {
    if ('root' in node && node.root) {
      const url = node.index?.url ?? node.children.find((node) => node.type === 'page')?.url;

      if (url) {
        const option: LayoutTab = {
          title: node.name,
          icon: node.icon,
          description: node.description,
          url,
          unlisted,
          $folder: node,
        };

        const mapped = transform ? transform(option, node) : option;
        if (mapped) results.push(mapped);
      }
    }

    for (const child of node.children) {
      if (child.type === 'folder') next(child, unlisted);
    }
  }

  next(tree);
  if (tree.fallback) next(tree.fallback, true);

  return results;
}

/**
 * Get link items with shortcuts
 */
export function resolveLinkItems({
  links = [],
  githubUrl,
}: Pick<BaseLayoutProps, 'links' | 'githubUrl'>): LinkItemType[] {
  const result = [...links];

  if (githubUrl)
    result.push({
      type: 'icon',
      url: githubUrl,
      text: 'Github',
      label: 'GitHub',
      icon: (
        <svg role="img" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
        </svg>
      ),
      external: true,
    });

  return result;
}

export function useLinkItems({ githubUrl, links }: Pick<BaseLayoutProps, 'links' | 'githubUrl'>) {
  return useMemo(() => {
    const all = resolveLinkItems({ links, githubUrl });
    const navItems: LinkItemType[] = [];
    const menuItems: LinkItemType[] = [];

    for (const item of all) {
      switch (item.on) {
        case 'menu':
          menuItems.push(item);
          break;
        case 'nav':
          navItems.push(item);
          break;
        default:
          navItems.push(item);
          menuItems.push(item);
      }
    }

    return { navItems, menuItems, all };
  }, [links, githubUrl]);
}

export function isLayoutTabActive(tab: LayoutTab, pathname: string) {
  if (tab.$folder) {
    return (
      PageTree.findPath(
        tab.$folder.children,
        (node) => node.type === 'page' && isActive(node.url, pathname),
      ) !== null
    );
  }

  if (tab.urls) {
    return tab.urls.has(normalize(pathname));
  }

  return isActive(tab.url, pathname, true);
}

export type * from '@/utils/link-item';
