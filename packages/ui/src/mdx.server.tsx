import type { LoaderConfig, LoaderOutput, Page } from 'fumadocs-core/source';
import type { ComponentProps, FC } from 'react';
import defaultMdxComponents from '@/mdx';
import * as path from 'node:path';

/**
 * Extend the default Link component to resolve relative file paths in `href`.
 *
 * @param page the current page
 * @param source the source object
 * @param OverrideLink The component to override from
 */
export function createRelativeLink(
  source: LoaderOutput<LoaderConfig>,
  page: Page,
  OverrideLink: FC<ComponentProps<'a'>> = defaultMdxComponents.a,
): FC<ComponentProps<'a'>> {
  return async function RelativeLink({ href, ...props }) {
    if (
      href &&
      href.startsWith('.') &&
      (href.endsWith('.md') || href.endsWith('.mdx'))
    ) {
      const pages = source.getPages();
      const hrefPath = path.join(page.file.dirname, href);
      const targetPage = pages.find((item) => item.file.path === hrefPath);

      if (targetPage) href = targetPage.url;
    }

    return <OverrideLink href={href} {...props} />;
  };
}
