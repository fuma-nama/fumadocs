function r(i, t = !1) {
  const o = i;
  for (const e in o) {
    if ((o[e] === void 0 && delete o[e], !t)) continue;
    const n = o[e];
    if (typeof n == 'object' && n !== null) {
      r(n, t);
      continue;
    }
    if (Array.isArray(n)) for (const f of n) r(f, t);
  }
  return i;
}
export { r };
