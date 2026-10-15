import type { SerializedPageTree } from 'fumadocs-core/source/client';
import type { TOCItemType } from 'fumadocs-core/toc';
import type { GeneratedPageProps } from 'fumadocs-openapi';

/** what the client fetches to render any page, the server renders from the same data */
export interface SiteData {
  title: string;
  /** URL of the home page */
  url: string;
  tree: SerializedPageTree;
  /** URL -> page */
  pages: Record<string, PageData>;
  /** document ID -> URL of the bundled document */
  documents: Record<string, string>;
  /** URL of the exported search index */
  search: string;
  styles: string[];
  proxyUrl?: string;
}

export type PageData = APIPageData | OverviewPageData;

export interface APIPageData {
  type: 'api';
  title: string;
  description?: string;
  toc: TOCItemType[];
  props: GeneratedPageProps;
}

export interface OverviewPageData {
  type: 'overview';
  title: string;
  heading: string;
  description?: string;
  version?: string;
  /** Markdown */
  body?: string;
  cards: { title: string; description?: string; url: string }[];
}
