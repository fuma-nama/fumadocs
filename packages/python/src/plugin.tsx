import { cn } from 'cn';
import type { LoaderPlugin } from 'fumadocs-core/source';
import { badgeVariants } from './badge';
import type { PythonPage } from './source';

/** Adds a `module`/`class` badge to generated pages in the page tree. */
export function pythonPlugin(): LoaderPlugin {
  return {
    name: 'fumadocs:python',
    transformPageTree: {
      file(node, filePath) {
        // folders take their name from their index page, keep them plain
        if (!filePath || filePath.endsWith('/index.mdx')) return node;
        const file = this.storage.read(filePath);
        if (file?.format !== 'page') return node;

        const python = (file.data as Partial<PythonPage>)._python;
        if (!python) return node;

        node.name = (
          <>
            {node.name}{' '}
            <span className={cn(badgeVariants({ color: python.kind }), 'ms-auto py-0 text-nowrap')}>
              {python.kind}
            </span>
          </>
        );
        return node;
      },
    },
  };
}
