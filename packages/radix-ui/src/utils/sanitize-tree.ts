import type * as PageTree from 'fumadocs-core/page-tree';

/**
 * Sanitize a copy of the page tree before it's passed to a client component
 * (see fuma-nama/fumadocs#3578).
 *
 * The loader's page tree carries fields that client-rendered code never reads, but that still
 * get serialized into every page's RSC flight data when the tree crosses the client boundary
 * unmodified:
 *
 * - `$ref`: the loader's internal file paths, used only while building the tree.
 * - `$id` on every node except the tree's own root: `TreeContextProvider` reads the root's
 *   `$id` as a stable identity key across navigations, but any other node without an `$id` is
 *   simply assigned one lazily on first use, so dropping it here is safe.
 * - any field whose value is `undefined`, which RSC otherwise serializes as a `"$undefined"`
 *   placeholder for every unset optional field on every node.
 *
 * The input tree is never mutated.
 */
export function sanitizeTreeForClient(tree: PageTree.Root): PageTree.Root {
  const { $ref: _ref, fallback, children, ...rest } = tree;

  return {
    ...stripUndefined(rest),
    $id: tree.$id ?? generateFallbackId(),
    children: children.map(sanitizeNode),
    ...(fallback ? { fallback: sanitizeTreeForClient(fallback) } : {}),
  };
}

function sanitizeNode(node: PageTree.Node): PageTree.Node {
  switch (node.type) {
    case 'folder': {
      const { $ref: _ref, $id: _id, children, index, ...rest } = node;

      return {
        ...stripUndefined(rest),
        children: children.map(sanitizeNode),
        ...(index ? { index: sanitizeItem(index) } : {}),
      };
    }
    case 'page':
      return sanitizeItem(node);
    case 'separator': {
      const { $id: _id, ...rest } = node;

      return stripUndefined(rest);
    }
  }
}

function sanitizeItem(item: PageTree.Item): PageTree.Item {
  const { $ref: _ref, $id: _id, ...rest } = item;

  return stripUndefined(rest);
}

function stripUndefined<T extends object>(obj: T): T {
  const out = {} as T;

  for (const key of Object.keys(obj) as (keyof T)[]) {
    if (obj[key] !== undefined) out[key] = obj[key];
  }

  return out;
}

function generateFallbackId(): string {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`;
}
