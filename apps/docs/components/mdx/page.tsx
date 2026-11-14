import type { ComponentProps, FC } from 'react';
import * as Twoslash from 'fumadocs-twoslash/ui';
import { Callout } from 'fumadocs-ui/components/callout';
import { TypeTable } from 'fumadocs-ui/components/type-table';
import { Card, Cards } from 'fumadocs-ui/components/card';
import { Banner } from 'fumadocs-ui/components/banner';
import Link from 'fumadocs-core/link';
import { findSiblings, type Item } from 'fumadocs-core/page-tree';
import { PathUtils } from 'fumadocs-core/source';
import { asMarkdown } from 'fumadocs-core/server';
import { type Page, source } from '@/lib/source';
import { getMDXComponents } from '@/components/mdx';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { Wrapper } from '@/components/preview/wrapper';
import { Mermaid } from '@/components/mdx/mermaid';
import { Installation } from '@/components/preview/installation';
import { Customization } from '@/components/preview/customization';
import { AgentInstructions } from '@/components/agent-instructions';
import { frameworkLink } from '@/lib/remark-framework-links';

/** the MDX components of a docs page, for its content and its Markdown */
export function getPageComponents(page: Page) {
  const framework = page.params?.framework;
  function resolveLink(href: string) {
    const found = source.getPageByHref((framework && frameworkLink(href, framework)) || href, {
      dir: PathUtils.dirname(page.path),
    });
    if (!found) return;

    return {
      page: found.page,
      href: found.hash ? `${found.page.url}#${found.hash}` : found.page.url,
    };
  }

  return getMDXComponents({
    ...Twoslash,
    a({ href, ...props }) {
      const found = href ? resolveLink(href) : undefined;
      if (!found) return <Link href={href} {...props} />;

      return (
        <HoverCard>
          <HoverCardTrigger href={found.href} {...props}>
            {props.children}
          </HoverCardTrigger>
          <HoverCardContent className="text-sm">
            <p className="font-medium">{found.page.data.title}</p>
            <p className="text-fd-muted-foreground">{found.page.data.description}</p>
          </HoverCardContent>
        </HoverCard>
      );
    },
    Card: ({ href, ...props }) => (
      <Card href={href && (resolveLink(href)?.href ?? href)} {...props} />
    ),
    Banner,
    Mermaid,
    TypeTable,
    Wrapper,
    blockquote: Callout as unknown as FC<ComponentProps<'blockquote'>>,
    DocsCategory({ url = page.url }: { url?: string }) {
      const items: Item[] = [];
      for (const item of findSiblings(source.getPageTree(), url)) {
        if (item.type === 'page') items.push(item);
        else if (item.type === 'folder' && item.index) items.push(item.index);
      }

      if (asMarkdown())
        return (
          <ul>
            {items.map((item) => (
              <li key={item.url}>
                <a href={item.url}>{item.name}</a>
                {item.description && <>: {item.description}</>}
              </li>
            ))}
          </ul>
        );

      return (
        <Cards>
          {items.map((item) => (
            <Card key={item.url} title={item.name} href={item.url}>
              {item.description}
            </Card>
          ))}
        </Cards>
      );
    },
    Installation,
    Customization,
    AgentInstructions,
  });
}
