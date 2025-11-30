import type { I18nConfig } from '@/i18n';
import type { LoaderConfig } from '../loader';
import type * as PageTree from '@/page-tree';
import { visit } from '@/page-tree/utils';
import { useMemo } from 'react';

export interface SerializedLoader<_Config extends LoaderConfig> {
  defaultLanguage: string;
  pageTree: Record<string, object>;
}

export interface ClientLoader<Config extends LoaderConfig> {
  getPageTree: (
    locale?: Config['i18n'] extends I18nConfig<infer Lang> ? Lang : undefined,
  ) => PageTree.Root;
}

/**
 * create a client-side loader.
 *
 * It only receives the serialized loader from server-side, hence not sharing plugins and some properties.
 */
export function deserializeLoader<Config extends LoaderConfig>(
  serialized: SerializedLoader<Config>,
): ClientLoader<Config> {
  const { defaultLanguage, pageTree: serializedPageTree } = serialized;

  const pageTree: Record<string, PageTree.Root> = {};
  for (const k in serializedPageTree) {
    pageTree[k] = deserializePageTree(serializedPageTree[k] as PageTree.Root);
  }

  return {
    getPageTree(locale: string = defaultLanguage) {
      return pageTree[locale] ?? pageTree[defaultLanguage];
    },
  };
}

function deserializePageTree(root: PageTree.Root): PageTree.Root {
  function deserializeHTML(html: string) {
    return (
      <span
        dangerouslySetInnerHTML={{
          __html: html,
        }}
      />
    );
  }
  visit(root, (item) => {
    if ('icon' in item && typeof item.icon === 'string') {
      item.icon = deserializeHTML(item.icon);
    }
    if (typeof item.name === 'string') {
      item.name = deserializeHTML(item.name);
    }
  });

  return root;
}

/**
 * create & cache a client-side loader.
 *
 * @see deserializeLoader
 */
export function useFumadocsLoader<Config extends LoaderConfig>(
  serialized: SerializedLoader<Config>,
): ClientLoader<Config> {
  return useMemo(() => deserializeLoader(serialized), [serialized]);
}
