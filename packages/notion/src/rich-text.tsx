import type { RichTextItemResponse } from '@notionhq/client';
import { cn } from 'cnfast';
import type { ReactNode } from 'react';
import type { NotionPageIcon } from './blocks';
import { colorAttribute, getNotionColorClassName } from './colors';
import { getSafeHref } from './url';

export interface NotionRichTextProps {
  value: RichTextItemResponse[];
}

export function NotionRichText({ value }: NotionRichTextProps) {
  return value.map((item, index) => <RichTextItem key={index} item={item} />);
}

function RichTextItem({ item }: { item: RichTextItemResponse }) {
  const { annotations } = item;
  let node = renderRichTextValue(item);

  if (annotations.code) {
    node = (
      <code className="rounded-md bg-fd-muted px-1 py-0.5 font-mono text-[0.875em]">{node}</code>
    );
  }
  if (annotations.bold) node = <strong>{node}</strong>;
  if (annotations.italic) node = <em>{node}</em>;
  if (annotations.strikethrough) node = <s>{node}</s>;
  if (annotations.underline) node = <u>{node}</u>;

  const href = getSafeHref(item.href);
  if (href) {
    node = (
      <a className="font-medium text-fd-primary underline underline-offset-4" href={href}>
        {node}
      </a>
    );
  }

  // only colored runs need a wrapper, the rest render as plain text nodes
  const className = getNotionColorClassName(annotations.color, true);
  if (!className) return node;

  return (
    <span className={className} data-notion-color={colorAttribute(annotations.color)}>
      {node}
    </span>
  );
}

function renderRichTextValue(item: RichTextItemResponse): ReactNode {
  if (item.type === 'equation') {
    // rendered as its LaTeX source: the package ships no math renderer
    return (
      <span className="font-mono" data-notion-equation="">
        {item.equation.expression}
      </span>
    );
  }
  if (item.type !== 'mention') return item.plain_text;

  if (item.mention.type === 'date') {
    return (
      <time dateTime={item.mention.date.start} data-notion-mention="date">
        {item.plain_text}
      </time>
    );
  }

  return <span data-notion-mention={item.mention.type}>{item.plain_text}</span>;
}

/**
 * Render a Notion icon, or return `undefined` when it has no visual representation. Callers can
 * then fall back to their own icon instead of rendering an empty space.
 */
export function renderNotionIcon(
  icon: NotionPageIcon | null,
  src: string | undefined,
  className?: string,
): ReactNode | undefined {
  if (!icon) return;
  const iconClassName = cn('me-1.5 inline-block size-5 object-contain align-[-0.2em]', className);

  if (icon.type === 'emoji') {
    return (
      <span className={iconClassName} data-notion-icon="emoji">
        {icon.emoji}
      </span>
    );
  }
  if (icon.type === 'custom_emoji') {
    return (
      <img
        alt={icon.custom_emoji.name}
        className={iconClassName}
        data-notion-icon="custom-emoji"
        src={icon.custom_emoji.url}
      />
    );
  }
  // Notion's built-in "noticon" set has no public glyph source, so it has no faithful rendering
  if (icon.type === 'icon') return;

  const url = src ?? (icon.type === 'file' ? icon.file.url : icon.external.url);
  return <img alt="" className={iconClassName} data-notion-icon="file" src={url} />;
}
