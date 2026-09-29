import { slug } from 'github-slugger';

/** slugify segments, append `\0` to keep segment as-is */
export function anchorSegments(...segs: string[]): string {
  const mapped: string[] = [];
  for (const seg of segs) {
    if (seg.startsWith('\0')) {
      mapped.push(seg.slice(1));
    } else if (seg.length > 0) {
      mapped.push(slug(seg));
    }
  }
  return mapped.join('.');
}

/**
 * Check if `id1` starts with `id2`
 */
export function anchorIdStartsWith(id1: string, id2: string): boolean {
  return id1 === id2 || id1.startsWith(`${id2}.`);
}
