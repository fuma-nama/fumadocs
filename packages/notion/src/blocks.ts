import type { BlockObjectResponse, RichTextItemResponse } from '@notionhq/client';
import type { StructuredData } from 'fumadocs-core/mdx-plugins';

export type NotionBlock = BlockObjectResponse & {
  children?: NotionBlock[];
};

export type NotionBlockType = NotionBlock['type'];
export type NotionBlockOfType<T extends NotionBlockType> = Extract<NotionBlock, { type: T }>;

/** Blocks that can carry a Notion-hosted file, either as content or as an icon. */
export type NotionAssetBlock = NotionBlockOfType<
  'audio' | 'callout' | 'embed' | 'file' | 'image' | 'paragraph' | 'pdf' | 'video'
>;

export type NotionColor = NotionBlockOfType<'paragraph'>['paragraph']['color'];
export type NotionPageIcon = NonNullable<NotionBlockOfType<'callout'>['callout']['icon']>;

export function richTextToPlainText(value: RichTextItemResponse[]): string {
  return value.map((item) => item.plain_text).join('');
}

export function isAssetBlock(block: NotionBlock): block is NotionAssetBlock {
  return (
    block.type === 'audio' ||
    block.type === 'callout' ||
    block.type === 'embed' ||
    block.type === 'file' ||
    block.type === 'image' ||
    block.type === 'paragraph' ||
    block.type === 'pdf' ||
    block.type === 'video'
  );
}

/** The file attached to a block, or the file backing its icon. */
export function getAsset(block: NotionAssetBlock) {
  switch (block.type) {
    case 'audio':
      return block.audio;
    case 'file':
      return block.file;
    case 'image':
      return block.image;
    case 'pdf':
      return block.pdf;
    case 'video':
      return block.video;
    case 'callout':
      return isFileIcon(block.callout.icon) ? block.callout.icon : undefined;
    case 'paragraph':
      return isFileIcon(block.paragraph.icon) ? block.paragraph.icon : undefined;
  }
}

export function getNotionFileUrl(block: NotionAssetBlock): string | undefined {
  if (block.type === 'embed') return block.embed.url;
  const asset = getAsset(block);
  if (!asset) return;
  return asset.type === 'file' ? asset.file.url : asset.external.url;
}

function isFileIcon(
  icon: NotionPageIcon | null,
): icon is Extract<NotionPageIcon, { type: 'file' | 'external' }> {
  return icon?.type === 'file' || icon?.type === 'external';
}

export function getBlockText(block: NotionBlock): string {
  switch (block.type) {
    case 'paragraph':
      return richTextToPlainText(block.paragraph.rich_text);
    case 'heading_1':
      return richTextToPlainText(block.heading_1.rich_text);
    case 'heading_2':
      return richTextToPlainText(block.heading_2.rich_text);
    case 'heading_3':
      return richTextToPlainText(block.heading_3.rich_text);
    case 'heading_4':
      return richTextToPlainText(block.heading_4.rich_text);
    case 'bulleted_list_item':
      return richTextToPlainText(block.bulleted_list_item.rich_text);
    case 'numbered_list_item':
      return richTextToPlainText(block.numbered_list_item.rich_text);
    case 'quote':
      return richTextToPlainText(block.quote.rich_text);
    case 'to_do':
      return richTextToPlainText(block.to_do.rich_text);
    case 'toggle':
      return richTextToPlainText(block.toggle.rich_text);
    case 'template':
      return richTextToPlainText(block.template.rich_text);
    case 'code':
      return richTextToPlainText(block.code.rich_text);
    case 'callout':
      return richTextToPlainText(block.callout.rich_text);
    case 'equation':
      return block.equation.expression;
    case 'child_page':
      return block.child_page.title;
    case 'child_database':
      return block.child_database.title;
    case 'bookmark':
      return richTextToPlainText(block.bookmark.caption) || block.bookmark.url;
    case 'embed':
      return richTextToPlainText(block.embed.caption) || block.embed.url;
    case 'link_preview':
      return block.link_preview.url;
    case 'image':
      return richTextToPlainText(block.image.caption);
    case 'video':
      return richTextToPlainText(block.video.caption);
    case 'audio':
      return richTextToPlainText(block.audio.caption);
    case 'pdf':
      return richTextToPlainText(block.pdf.caption);
    case 'file':
      return richTextToPlainText(block.file.caption) || block.file.name;
    case 'table_row':
      return block.table_row.cells.map(richTextToPlainText).join('\t');
    case 'meeting_notes':
      return block.meeting_notes.title
        ? richTextToPlainText(block.meeting_notes.title)
        : 'Meeting notes';
    case 'transcription':
      return block.transcription.title
        ? richTextToPlainText(block.transcription.title)
        : 'Meeting notes';
    default:
      return '';
  }
}

export function blocksToPlainText(blocks: NotionBlock[]): string {
  const lines: string[] = [];
  walkBlocks(blocks, (block) => {
    const text = getBlockText(block).trim();
    if (text) lines.push(text);
  });
  return lines.join('\n\n');
}

export function blocksToStructuredData(blocks: NotionBlock[]): StructuredData {
  const result: StructuredData = { headings: [], contents: [] };
  let heading: string | undefined;

  walkBlocks(blocks, (block) => {
    const content = getBlockText(block).trim();
    if (!content) return;

    if (getHeadingDepth(block) !== undefined) {
      heading = block.id;
      result.headings.push({ id: block.id, content });
    } else {
      result.contents.push({ heading, content });
    }
  });

  return result;
}

export function blocksToTableOfContents(blocks: NotionBlock[]) {
  const result: Array<{ title: string; url: string; depth: number }> = [];
  walkBlocks(blocks, (block) => {
    const depth = getHeadingDepth(block);
    if (depth === undefined) return;
    const title = getBlockText(block).trim();
    if (title) result.push({ title, url: `#${block.id}`, depth });
  });
  return result;
}

export function getHeadingDepth(block: NotionBlock): number | undefined {
  switch (block.type) {
    case 'heading_1':
      return 1;
    case 'heading_2':
      return 2;
    case 'heading_3':
      return 3;
    case 'heading_4':
      return 4;
  }
}

function walkBlocks(blocks: NotionBlock[], visit: (block: NotionBlock) => void): void {
  for (const block of blocks) {
    visit(block);
    if (block.children) walkBlocks(block.children, visit);
  }
}
