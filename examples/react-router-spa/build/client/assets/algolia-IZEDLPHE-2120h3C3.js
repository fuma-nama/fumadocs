import { c as l } from './chunk-OTD7MV33-qJr9DjGl.js';
function h(e) {
  const n = [],
    r = new Set();
  for (const t of e)
    (r.has(t.url) ||
      (r.add(t.url),
      n.push({
        id: t.url,
        type: 'page',
        breadcrumbs: t.breadcrumbs,
        url: t.url,
        content: t.title,
      })),
      n.push({
        id: t.objectID,
        type: t.content === t.section ? 'heading' : 'text',
        url: t.section_id ? `${t.url}#${t.section_id}` : t.url,
        content: t.content,
      }));
  return n;
}
async function g(
  e,
  { indexName: n, onSearch: r, client: t, locale: o, tag: s },
) {
  if (e.trim().length === 0) return [];
  const c = r
      ? await r(e, s, o)
      : await t.searchForHits({
          requests: [
            {
              type: 'default',
              indexName: n,
              query: e,
              distinct: 5,
              hitsPerPage: 10,
              filters: s ? `tag:${s}` : void 0,
            },
          ],
        }),
    u = l(e);
  return h(c.results[0].hits).flatMap((i) =>
    i.type === 'page'
      ? {
          ...i,
          contentWithHighlights:
            i.contentWithHighlights ?? u.highlight(i.content),
        }
      : [],
  );
}
export { h as groupResults, g as searchDocs };
