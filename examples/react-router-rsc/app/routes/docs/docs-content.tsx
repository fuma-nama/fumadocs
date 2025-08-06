"use client";

import { docs } from '../../../source.generated';
import { toClientRenderer } from 'fumadocs-mdx/runtime/vite';
import defaultMdxComponents from 'fumadocs-ui/mdx';
import { DocsBody, DocsTitle, DocsDescription } from 'fumadocs-ui/page';

const renderer = toClientRenderer(
  docs.doc,
  ({ toc, default: Mdx, frontmatter }) => {
    return (
      <div className="fd-docs-page">
        <DocsTitle>{frontmatter.title}</DocsTitle>
        <DocsDescription>{frontmatter.description}</DocsDescription>
        <DocsBody>
          <Mdx components={{ ...defaultMdxComponents }} />
        </DocsBody>
        
        {toc && toc.length > 0 && (
          <nav className="fd-toc">
            <h4 className="fd-toc-title">On This Page</h4>
            <ul className="fd-toc-list">
              {toc.map((item) => (
                <li key={item.url} className="fd-toc-item">
                  <a href={item.url} className="fd-toc-link">
                    {item.title}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        )}
      </div>
    );
  },
);

export default function DocsContent({ path }: { path: string }) {
  const Content = renderer[path];
  
  if (!Content) {
    return <div className="fd-error">Content not found for path: {path}</div>;
  }
  
  return <Content />;
}