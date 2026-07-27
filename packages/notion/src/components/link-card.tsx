import type { RichTextItemResponse } from '@notionhq/client';
import {
  ArrowUpRight,
  Bookmark,
  Download,
  FileText,
  Music,
  Play,
  Table2,
  type LucideIcon,
} from 'lucide-react';
import { richTextToPlainText } from '../blocks';
import { NotionRichText } from '../rich-text';
import { getSafeHref, getUrlHost, getUrlLabel } from '../url';
import { Card } from 'fumadocs-ui/components/card';

export type NotionLinkKind =
  | 'audio'
  | 'bookmark'
  | 'database'
  | 'embed'
  | 'file'
  | 'link-preview'
  | 'page'
  | 'pdf'
  | 'video';

const icons: Record<NotionLinkKind, LucideIcon> = {
  audio: Music,
  bookmark: Bookmark,
  database: Table2,
  embed: ArrowUpRight,
  file: Download,
  'link-preview': ArrowUpRight,
  page: FileText,
  pdf: FileText,
  video: Play,
};

export interface NotionLinkCardProps {
  url: string;
  kind: NotionLinkKind;
  caption?: RichTextItemResponse[];
  label?: string;
  className?: string;
}

/**
 * The fallback for anything that can't be rendered inline: bookmarks, unframeable embeds,
 * downloads, and links to other Notion pages.
 */
export function NotionLinkCard({ url, kind, caption = [], label, className }: NotionLinkCardProps) {
  const href = getSafeHref(url);
  if (!href) return null;

  const Icon = icons[kind];

  return (
    <Card
      data-notion-block="link"
      data-notion-link-kind={kind}
      className={className}
      href={href}
      icon={<Icon className="size-4" />}
      title={label || richTextToPlainText(caption) || getUrlLabel(url)}
      rel="noreferrer"
    >
      {getUrlHost(url)}
    </Card>
  );
}

/** Links to another Notion page or database, which live outside the generated site. */
export function NotionPageLink({
  id,
  label,
  type,
}: {
  id: string;
  label: string;
  type: 'database' | 'page';
}) {
  return (
    <NotionLinkCard
      kind={type}
      label={label}
      url={`https://www.notion.so/${id.replaceAll('-', '')}`}
    />
  );
}

export function NotionCaption({ value }: { value: RichTextItemResponse[] }) {
  if (value.length === 0) return null;

  return (
    <figcaption className="mt-2 text-sm text-fd-muted-foreground">
      <NotionRichText value={value} />
    </figcaption>
  );
}
