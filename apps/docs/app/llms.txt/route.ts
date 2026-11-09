import { docsLlms, frameworkNote } from '@/lib/llms';
import { source } from '@/lib/source';
import { defaultFramework } from '@/lib/framework';

export const revalidate = false;

export async function GET() {
  const out = ['# Docs', '', `> ${frameworkNote}`, ''];
  for (let node of source.getPageTree().children) {
    if (node.type === 'folder' && node.$id === '(framework)')
      node = {
        ...node,
        // the folders of each framework
        children: node.children.filter(
          (child) => child.type !== 'folder' || child.$id === `(framework)/${defaultFramework}`,
        ),
      };
    out.push(await docsLlms.indexNode(node));
  }

  return new Response(out.join('\n'));
}
