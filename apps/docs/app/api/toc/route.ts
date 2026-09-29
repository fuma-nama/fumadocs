import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import { frontmatter as parseFrontmatter } from 'fumadocs-core/content/md/frontmatter';
import { structure } from 'fumadocs-core/mdx-plugins/remark-structure';
import remarkMdx from 'remark-mdx';

interface TocResponse {
  title?: string;
  key?: string;
}

export async function POST(request: NextRequest) {
  try {
    const { payload } = await request.json();

    const { content, data } = parseFrontmatter(payload);
    const { title = '', key = '' } = data as TocResponse;

    // const options = {
    //   types: (node: { type: string }) => node.type !== 'list' && node.type !== 'listItem',
    // };

    let contentStructure;
    try {
      contentStructure = structure(content, [remarkMdx]);
    } catch {
      contentStructure = structure(content, []);
    }

    return NextResponse.json({
      structure: contentStructure,
      title,
      key,
    });
  } catch (error) {
    console.error('Error processing TOC request:', error);

    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
