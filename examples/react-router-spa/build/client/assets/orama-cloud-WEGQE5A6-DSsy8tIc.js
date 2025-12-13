import { r as p } from './chunk-ZMWYLUDP-oajMeTFk.js';
import { c as m } from './chunk-OTD7MV33-qJr9DjGl.js';
async function x(h, g) {
  const o = m(h),
    i = [],
    { index: d = 'default', client: l, params: n, tag: s } = g;
  if (d === 'crawler') {
    const c = await l.search({
      datasources: [],
      ...n,
      term: h,
      where: {
        category: s ? { eq: s.slice(0, 1).toUpperCase() + s.slice(1) } : void 0,
        ...n?.where,
      },
      limit: 10,
    });
    if (!c) return i;
    for (const r of c.hits) {
      const e = r.document;
      i.push(
        {
          id: r.id,
          type: 'page',
          content: e.title,
          contentWithHighlights: o.highlight(e.title),
          url: e.path,
        },
        {
          id: 'page' + r.id,
          type: 'text',
          content: e.content,
          contentWithHighlights: o.highlight(e.content),
          url: e.path,
        },
      );
    }
    return i;
  }
  const u = {
      datasources: [],
      ...n,
      term: h,
      where: p({ tag: s, ...n?.where }),
      groupBy: { properties: ['page_id'], max_results: 7, ...n?.groupBy },
    },
    a = await l.search(u);
  if (!a || !a.groups) return i;
  for (const c of a.groups) {
    let r = !1;
    for (const e of c.result) {
      const t = e.document;
      (r ||
        (i.push({
          id: t.page_id,
          type: 'page',
          content: t.title,
          breadcrumbs: t.breadcrumbs,
          contentWithHighlights: o.highlight(t.title),
          url: t.url,
        }),
        (r = !0)),
        i.push({
          id: t.id,
          content: t.content,
          contentWithHighlights: o.highlight(t.content),
          type: t.content === t.section ? 'heading' : 'text',
          url: t.section_id ? `${t.url}#${t.section_id}` : t.url,
        }));
    }
  }
  return i;
}
export { x as searchDocs };
