import type { RichTextItemResponse } from '@notionhq/client';
import { cn } from 'cnfast';
import type { HighlightOptions } from 'fumadocs-core/highlight';
import { CalloutContainer } from 'fumadocs-ui/components/callout';
import { CodeBlock, Pre } from 'fumadocs-ui/components/codeblock';
import { ServerCodeBlock } from 'fumadocs-ui/components/codeblock.rsc';
import { Heading } from 'fumadocs-ui/components/heading';
import { ChevronRight } from 'lucide-react';
import { Fragment, type ComponentType, type CSSProperties, type ReactNode } from 'react';
import {
  blocksToTableOfContents,
  getNotionFileUrl,
  isAssetBlock,
  richTextToPlainText,
  type NotionAssetBlock,
  type NotionBlock,
  type NotionBlockOfType,
  type NotionBlockType,
  type NotionColor,
} from './blocks';
import { colorAttribute, getCalloutType, getNotionColorClassName } from './colors';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './components/collapsible';
import { NotionLinkCard, NotionPageLink } from './components/link-card';
import {
  NotionAudio,
  NotionEmbed,
  NotionFile,
  NotionImage,
  NotionPdf,
  NotionVideo,
} from './components/media';
import { NotionMeetingNotes } from './components/meeting-notes';
import { NotionTable } from './components/table';
import { NotionRichText, renderNotionIcon } from './rich-text';
import { NotionTabs, type NotionTabItem } from './tabs';

export { getNotionFileUrl } from './blocks';
export type {
  NotionAssetBlock,
  NotionBlock,
  NotionBlockOfType,
  NotionBlockType,
  NotionColor,
} from './blocks';
export { NotionRichText, type NotionRichTextProps } from './rich-text';

type NotionCodeLanguage = NotionBlockOfType<'code'>['code']['language'];
type ShikiLanguage = HighlightOptions['lang'];

type HeadingValue = {
  rich_text: RichTextItemResponse[];
  color: NotionColor;
  is_toggleable: boolean;
};

export type NotionCodeHighlighter = (
  code: string,
  language: NotionCodeLanguage,
) => ReactNode | Promise<ReactNode>;

export interface NotionBlockComponentProps<B extends NotionBlock = NotionBlock> {
  block: B;
  children: ReactNode;
  fileUrl: string | undefined;
  renderRichText: (value: RichTextItemResponse[]) => ReactNode;
}

export type NotionComponents = {
  [Type in NotionBlockType]?: ComponentType<NotionBlockComponentProps<NotionBlockOfType<Type>>>;
};

export interface NotionRendererProps {
  blocks: NotionBlock[];
  className?: string;
  components?: NotionComponents;
  /** Highlight code on the server. Set to `false` to render plain code. */
  highlightCode?: NotionCodeHighlighter | false;
  /** Resolve internal Notion file URLs, for example through a refresh proxy. */
  getFileUrl?: (block: NotionAssetBlock) => string | undefined;
}

interface RenderContext {
  components: NotionComponents;
  getFileUrl: (block: NotionAssetBlock) => string | undefined;
  highlightCode: NotionCodeHighlighter | false | undefined;
  toc: ReturnType<typeof blocksToTableOfContents>;
}

export async function NotionRenderer({
  blocks,
  className,
  components = {},
  highlightCode,
  getFileUrl = getNotionFileUrl,
}: NotionRendererProps) {
  const context: RenderContext = {
    components,
    getFileUrl,
    highlightCode,
    toc: blocksToTableOfContents(blocks),
  };

  return (
    <div className={cn('wrap-break-word text-fd-foreground', className)} data-notion-renderer="">
      {await renderBlocks(blocks, context)}
    </div>
  );
}

/**
 * Blocks are rendered eagerly rather than returned as async elements, so the tree also works with
 * synchronous renderers such as `renderToStaticMarkup`.
 */
async function renderBlocks(blocks: NotionBlock[], context: RenderContext): Promise<ReactNode[]> {
  const keys: string[] = [];
  const pending: Promise<ReactNode>[] = [];

  for (let index = 0; index < blocks.length; index++) {
    const block = blocks[index]!;

    // Notion returns list items as siblings, so consecutive items are collected into one list
    if (block.type === 'bulleted_list_item' || block.type === 'numbered_list_item') {
      const type = block.type;
      const items: NotionBlock[] = [];
      while (blocks[index]?.type === type) {
        items.push(blocks[index]!);
        index++;
      }
      index--;

      keys.push(block.id);
      pending.push(renderList(block, items, context));
      continue;
    }

    keys.push(block.id);
    pending.push(renderBlock(block, context));
  }

  return withKeys(await Promise.all(pending), keys);
}

/** Keys every block centrally, so individual blocks can return bare elements or fragments. */
function withKeys(nodes: ReactNode[], keys: string[]): ReactNode[] {
  return nodes.map((node, index) => <Fragment key={keys[index]}>{node}</Fragment>);
}

/** A block's children, indented the way Notion nests them. */
function indent(children: ReactNode[] | undefined): ReactNode {
  if (!children || children.length === 0) return null;

  return (
    <div className="ms-5" data-notion-children="">
      {children}
    </div>
  );
}

async function renderList(
  first: NotionBlockOfType<'bulleted_list_item' | 'numbered_list_item'>,
  items: NotionBlock[],
  context: RenderContext,
): Promise<ReactNode> {
  const children = withKeys(
    await Promise.all(items.map((item) => renderBlock(item, context))),
    items.map((item) => item.id),
  );

  if (first.type === 'bulleted_list_item') {
    return (
      <ul className="my-3 list-disc space-y-1 ps-6 [li_&]:my-1" data-notion-list="bulleted">
        {children}
      </ul>
    );
  }

  return (
    <ol
      className="my-3 list-decimal space-y-1 ps-6 [li_&]:my-1"
      data-notion-list="numbered"
      start={first.numbered_list_item.list_start_index}
      type={getOrderedListType(first.numbered_list_item.list_format)}
    >
      {children}
    </ol>
  );
}

async function renderBlock(block: NotionBlock, context: RenderContext): Promise<ReactNode> {
  // `table` and `tab` lay their own children out from the raw blocks
  const children =
    block.children && block.type !== 'table' && block.type !== 'tab'
      ? await renderBlocks(block.children, context)
      : undefined;
  const fileUrl = isAssetBlock(block) ? context.getFileUrl(block) : undefined;

  const Custom = context.components[block.type] as
    | ComponentType<NotionBlockComponentProps>
    | undefined;
  if (Custom) {
    return (
      <Custom
        block={block}
        fileUrl={fileUrl}
        renderRichText={(value) => <NotionRichText value={value} />}
      >
        {children}
      </Custom>
    );
  }

  switch (block.type) {
    case 'paragraph':
      return (
        <>
          <p
            className={cn('my-3 text-pretty', getNotionColorClassName(block.paragraph.color))}
            data-notion-block="paragraph"
            data-notion-color={colorAttribute(block.paragraph.color)}
          >
            {renderNotionIcon(block.paragraph.icon, fileUrl)}
            <NotionRichText value={block.paragraph.rich_text} />
          </p>
          {indent(children)}
        </>
      );
    case 'heading_1':
      return renderHeading(block, 'h1', block.heading_1, children);
    case 'heading_2':
      return renderHeading(block, 'h2', block.heading_2, children);
    case 'heading_3':
      return renderHeading(block, 'h3', block.heading_3, children);
    case 'heading_4':
      return renderHeading(block, 'h4', block.heading_4, children);
    case 'bulleted_list_item':
      return (
        <li
          className={getNotionColorClassName(block.bulleted_list_item.color)}
          data-notion-color={colorAttribute(block.bulleted_list_item.color)}
        >
          <NotionRichText value={block.bulleted_list_item.rich_text} />
          {children}
        </li>
      );
    case 'numbered_list_item':
      return (
        <li
          className={getNotionColorClassName(block.numbered_list_item.color)}
          data-notion-color={colorAttribute(block.numbered_list_item.color)}
        >
          <NotionRichText value={block.numbered_list_item.rich_text} />
          {children}
        </li>
      );
    case 'quote':
      return (
        <blockquote
          className={cn(
            'my-4 rounded-lg border border-fd-border bg-fd-muted px-4 py-3 not-italic',
            getNotionColorClassName(block.quote.color),
          )}
          data-notion-block="quote"
          data-notion-color={colorAttribute(block.quote.color)}
        >
          <NotionRichText value={block.quote.rich_text} />
          {children}
        </blockquote>
      );
    case 'to_do':
      return (
        <div
          className="my-2"
          data-checked={block.to_do.checked ? '' : undefined}
          data-notion-block="to-do"
        >
          {/* the label names the checkbox, which is never interactive here */}
          <label className="flex items-baseline gap-2.5">
            <input
              checked={block.to_do.checked}
              className="size-4 accent-fd-primary"
              disabled
              readOnly
              type="checkbox"
            />
            <span
              className={cn(
                getNotionColorClassName(block.to_do.color),
                block.to_do.checked && 'text-fd-muted-foreground line-through',
              )}
              data-notion-color={colorAttribute(block.to_do.color)}
            >
              <NotionRichText value={block.to_do.rich_text} />
            </span>
          </label>
          {indent(children)}
        </div>
      );
    case 'toggle':
      return (
        <Collapsible className="my-3" data-notion-block="toggle">
          <CollapsibleTrigger className="group inline-flex w-full items-center gap-2 font-medium">
            <ToggleChevron />
            <span
              className={getNotionColorClassName(block.toggle.color)}
              data-notion-color={colorAttribute(block.toggle.color)}
            >
              <NotionRichText value={block.toggle.rich_text} />
            </span>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="ps-5.5">{children}</div>
          </CollapsibleContent>
        </Collapsible>
      );
    case 'template':
      return (
        <Collapsible className="my-3" data-notion-block="template">
          <CollapsibleTrigger className="group inline-flex w-full items-center gap-2 font-medium">
            <ToggleChevron />
            <NotionRichText value={block.template.rich_text} />
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="ps-5.5">{children}</div>
          </CollapsibleContent>
        </Collapsible>
      );
    case 'callout': {
      const type = getCalloutType(block.callout.color);
      return (
        <CalloutContainer
          data-notion-block="callout"
          data-notion-color={colorAttribute(block.callout.color)}
          icon={renderNotionIcon(block.callout.icon, fileUrl)}
          // Notion's neutral colors have no matching callout type. The accent tints the default
          // icon as well as the edge, so it has to stay legible against the card.
          style={
            type
              ? undefined
              : ({ '--callout-color': 'var(--color-fd-muted-foreground)' } as CSSProperties)
          }
          type={type}
        >
          <NotionRichText value={block.callout.rich_text} />
          {children}
        </CalloutContainer>
      );
    }
    case 'code':
      return renderCode(block, context);
    case 'equation':
      return (
        <div
          className="my-4 overflow-x-auto rounded-lg bg-fd-muted px-4 py-3 text-center font-mono"
          data-notion-block="equation"
          data-notion-equation=""
        >
          {block.equation.expression}
        </div>
      );
    case 'divider':
      return <hr className="my-6 border-fd-border" data-notion-block="divider" />;
    case 'image':
      return <NotionImage block={block} fileUrl={fileUrl} />;
    case 'video':
      return <NotionVideo block={block} fileUrl={fileUrl} />;
    case 'audio':
      return <NotionAudio block={block} fileUrl={fileUrl} />;
    case 'pdf':
      return <NotionPdf block={block} fileUrl={fileUrl} />;
    case 'file':
      return <NotionFile block={block} fileUrl={fileUrl} />;
    case 'embed':
      return <NotionEmbed block={block} fileUrl={fileUrl} />;
    case 'bookmark':
      return (
        <NotionLinkCard caption={block.bookmark.caption} kind="bookmark" url={block.bookmark.url} />
      );
    case 'link_preview':
      return <NotionLinkCard kind="link-preview" url={block.link_preview.url} />;
    case 'child_page':
      return (
        <section data-notion-block="child-page">
          <NotionPageLink id={block.id} label={block.child_page.title} type="page" />
          {indent(children)}
        </section>
      );
    case 'child_database':
      return (
        <section data-notion-block="child-database">
          <NotionPageLink id={block.id} label={block.child_database.title} type="database" />
          {indent(children)}
        </section>
      );
    case 'link_to_page':
      return (
        <NotionPageLink
          id={getLinkedPageId(block)}
          label="Open in Notion"
          type={block.link_to_page.type === 'database_id' ? 'database' : 'page'}
        />
      );
    case 'column_list':
      return (
        <div className="flex items-start gap-6 max-sm:block" data-notion-block="columns">
          {children}
        </div>
      );
    case 'column':
      return (
        <div
          className="min-w-0 flex-(--notion-column-ratio) max-sm:[&+&]:mt-4"
          data-notion-block="column"
          // always set: an undefined ratio would make the `flex` shorthand invalid
          style={{ '--notion-column-ratio': block.column.width_ratio ?? 1 } as CSSProperties}
        >
          {children}
        </div>
      );
    case 'table':
      return <NotionTable block={block} />;
    case 'table_row':
      // rows are laid out by their table, and are unreachable on their own
      return null;
    case 'table_of_contents':
      return (
        <nav
          aria-label="Table of contents"
          className={cn('my-4 text-sm', getNotionColorClassName(block.table_of_contents.color))}
          data-notion-block="table-of-contents"
          data-notion-color={colorAttribute(block.table_of_contents.color)}
        >
          <ul className="list-none ps-0">
            {context.toc.map((item) => (
              <li key={item.url} className={tocIndent[item.depth]} data-depth={item.depth}>
                <a className="text-fd-primary underline-offset-4 hover:underline" href={item.url}>
                  {item.title}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      );
    case 'synced_block':
      return <div data-notion-block="synced-block">{children}</div>;
    case 'tab':
      return renderTabs(block, context);
    case 'meeting_notes':
      return <NotionMeetingNotes value={block.meeting_notes}>{children}</NotionMeetingNotes>;
    case 'transcription':
      return <NotionMeetingNotes value={block.transcription}>{children}</NotionMeetingNotes>;
    case 'breadcrumb':
      // depends on a page hierarchy the renderer has no access to
      return null;
    case 'unsupported':
      return (
        <div
          className="my-4 rounded-lg border border-dashed border-fd-border px-4 py-3 text-sm text-fd-muted-foreground"
          data-notion-block="unsupported"
          role="note"
        >
          Unsupported Notion block: {block.unsupported.block_type}
        </div>
      );
  }
}

const tocIndent: Record<number, string> = { 1: '', 2: 'ps-4', 3: 'ps-8', 4: 'ps-12' };

function ToggleChevron() {
  return (
    <ChevronRight className="size-3.5 shrink-0 text-fd-muted-foreground transition-transform group-data-panel-open:rotate-90" />
  );
}

function renderHeading(
  block: NotionBlock,
  as: 'h1' | 'h2' | 'h3' | 'h4',
  value: HeadingValue,
  children: ReactNode[] | undefined,
): ReactNode {
  const className = getNotionColorClassName(value.color);
  const color = colorAttribute(value.color);

  if (!value.is_toggleable) {
    return (
      <Heading as={as} className={className} data-notion-color={color} id={block.id}>
        <NotionRichText value={value.rich_text} />
      </Heading>
    );
  }

  // `Heading`'s anchor is a link, which cannot be nested inside the collapsible's trigger button
  const Tag = as;
  return (
    <Collapsible className="my-4" data-notion-block="toggle-heading">
      <CollapsibleTrigger className="group inline-flex w-full items-center gap-2">
        <ToggleChevron />
        <Tag className={cn('my-0! scroll-m-28', className)} data-notion-color={color} id={block.id}>
          <NotionRichText value={value.rich_text} />
        </Tag>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="ps-5.5">{children}</div>
      </CollapsibleContent>
    </Collapsible>
  );
}

async function renderCode(
  block: NotionBlockOfType<'code'>,
  context: RenderContext,
): Promise<ReactNode> {
  const code = richTextToPlainText(block.code.rich_text);
  // `title` renders as a figure caption, which is text-only
  const title = richTextToPlainText(block.code.caption) || undefined;
  const lang = normalizeCodeLanguage(block.code.language);

  if (context.highlightCode === undefined) {
    // invoked rather than rendered as an element, so the highlighted output resolves here
    return ServerCodeBlock({
      code,
      lang,
      fallbackLanguage: 'text',
      codeblock: { title, ...codeAttributes(block) },
    });
  }

  const highlighted = context.highlightCode
    ? await context.highlightCode(code, block.code.language)
    : code;

  return (
    <CodeBlock title={title} {...codeAttributes(block)}>
      <Pre>{highlighted}</Pre>
    </CodeBlock>
  );
}

/** Kept off the Shiki options, which is where unknown props on `ServerCodeBlock` would land. */
function codeAttributes(block: NotionBlockOfType<'code'>) {
  return {
    'data-notion-block': 'code',
    'data-notion-language': block.code.language,
  };
}

async function renderTabs(
  block: NotionBlockOfType<'tab'>,
  context: RenderContext,
): Promise<ReactNode> {
  // each child paragraph is one tab: its rich text is the label, its children are the panel
  const panels = (block.children ?? []).filter(
    (child): child is NotionBlockOfType<'paragraph'> => child.type === 'paragraph',
  );

  const tabs: NotionTabItem[] = await Promise.all(
    panels.map(async (panel) => ({
      id: panel.id,
      label: <NotionRichText value={panel.paragraph.rich_text} />,
      icon: renderNotionIcon(panel.paragraph.icon, context.getFileUrl(panel)),
      children: panel.children ? await renderBlocks(panel.children, context) : null,
    })),
  );

  return <NotionTabs id={block.id} tabs={tabs} />;
}

/**
 * Map Notion's language names onto Shiki's. Names with no Shiki equivalent are left alone and
 * caught by `fallbackLanguage` at highlight time, which is what the cast stands in for.
 */
function normalizeCodeLanguage(language: NotionCodeLanguage): ShikiLanguage {
  const aliases: Partial<Record<NotionCodeLanguage, string>> = {
    'ascii art': 'text',
    assembly: 'asm',
    'c#': 'csharp',
    'c++': 'cpp',
    docker: 'dockerfile',
    'f#': 'fsharp',
    'java/c/c++/c#': 'text',
    'llvm ir': 'llvm',
    markup: 'html',
    mathematica: 'wolfram',
    'notion formula': 'text',
    'plain text': 'text',
    protobuf: 'proto',
    shell: 'shellscript',
    'vb.net': 'vb',
    'visual basic': 'vb',
    webassembly: 'wasm',
  };

  return (aliases[language] ?? language) as ShikiLanguage;
}

function getLinkedPageId(block: NotionBlockOfType<'link_to_page'>): string {
  switch (block.link_to_page.type) {
    case 'page_id':
      return block.link_to_page.page_id;
    case 'database_id':
      return block.link_to_page.database_id;
    case 'comment_id':
      return block.link_to_page.comment_id;
  }
}

function getOrderedListType(format: 'numbers' | 'letters' | 'roman' | undefined) {
  if (format === 'letters') return 'a' as const;
  if (format === 'roman') return 'i' as const;
  return undefined;
}
