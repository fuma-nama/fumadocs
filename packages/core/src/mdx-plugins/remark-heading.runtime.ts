import Slugger from 'github-slugger';

/** the IDs of the headings of a page for its props, a heading is the parts of its text or `null` when hidden */
export function createHeadingIds(headings: ((props: object) => unknown[] | null)[]) {
  const cache = new WeakMap<object, string[]>();
  return (props: object): string[] => {
    let ids = cache.get(props);
    if (ids) return ids;
    const slugger = new Slugger();
    ids = [];
    for (const heading of headings) {
      const parts = heading(props);
      let text = '';
      // like React, booleans and nullish values render nothing
      for (const part of parts ?? [])
        if (typeof part === 'string' || typeof part === 'number') text += part;
      // parts that render nothing leave the whitespace around them
      ids.push(parts ? slugger.slug(text.trim()) : '');
    }
    cache.set(props, ids);
    return ids;
  };
}
