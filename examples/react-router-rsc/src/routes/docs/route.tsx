import { useParams } from "react-router";
import { DocsLayout } from "fumadocs-ui/layouts/docs";
import {
  DocsBody,
  DocsDescription,
  DocsPage,
  DocsTitle,
} from "fumadocs-ui/page";
import { source } from "../../source";
import defaultMdxComponents from "fumadocs-ui/mdx";
import { docs } from "../../../source.generated";
import { toClientRenderer } from "fumadocs-mdx/runtime/vite";
import { type PageTree } from "fumadocs-core/server";

// Create a client renderer for MDX content
const renderer = toClientRenderer(
  docs.doc,
  ({ toc, default: Mdx, frontmatter }) => {
    return (
      <DocsPage toc={toc}>
        <DocsTitle>{frontmatter.title}</DocsTitle>
        <DocsDescription>{frontmatter.description}</DocsDescription>
        <DocsBody>
          <Mdx components={{ ...defaultMdxComponents }} />
        </DocsBody>
      </DocsPage>
    );
  },
);

export default function DocPage() {
  const params = useParams();
  const slugs = params["*"]?.split("/").filter((v) => v.length > 0) || [];
  const page = source.getPage(slugs);
  
  if (!page) {
    return <div>Page not found</div>;
  }

  const Content = renderer[page.path];

  return (
    <DocsLayout
      nav={{
        title: "Documentation",
      }}
      tree={source.pageTree as PageTree.Root}
    >
      <Content />
    </DocsLayout>
  );
}
