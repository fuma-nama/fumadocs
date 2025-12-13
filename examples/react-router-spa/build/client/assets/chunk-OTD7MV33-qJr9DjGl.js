function l(e) {
  return e.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
function g(e) {
  const i = e.trim();
  if (i.length === 0) return null;
  const t = Array.from(
    new Set(
      i
        .split(/\s+/)
        .map((n) => n.trim())
        .filter(Boolean),
    ),
  );
  if (t.length === 0) return null;
  const r = t.map(l).join('|');
  return new RegExp(`(${r})`, 'gi');
}
function o(e) {
  const i = typeof e == 'string' ? g(e) : e;
  return {
    highlight(t) {
      if (!i) return [{ type: 'text', content: t }];
      const r = [];
      let n = 0;
      for (const s of t.matchAll(i))
        (n < s.index &&
          r.push({ type: 'text', content: t.substring(n, s.index) }),
          r.push({ type: 'text', content: s[0], styles: { highlight: !0 } }),
          (n = s.index + s[0].length));
      return (
        n < t.length && r.push({ type: 'text', content: t.substring(n) }),
        r
      );
    },
  };
}
export { o as c };
