import Slugger from 'github-slugger';

function createSlugger(): (text: string) => string {
  const slugger = new Slugger();
  return (text) => slugger.slug(text);
}

/**
 * The IDs of the headings of a page for its props, a heading is the parts of its text or `null` when hidden.
 *
 * @param slugger - create the slug function of a page, called with the text of each heading that shows in document
 * order, so it can count duplicates
 */
export function createHeadingIds(
  headings: ((props: object) => unknown[] | null)[],
  slugger = createSlugger,
) {
  const cache = new WeakMap<object, string[]>();
  return (props: object): string[] => {
    let ids = cache.get(props);
    if (ids) return ids;
    const slug = slugger();
    ids = [];
    for (const heading of headings) {
      const parts = heading(props);
      let text = '';
      // like React, booleans and nullish values render nothing
      for (const part of parts ?? [])
        if (typeof part === 'string' || typeof part === 'number') text += part;
      // parts that render nothing leave the whitespace around them
      ids.push(parts ? slug(text.trim()) : '');
    }
    cache.set(props, ids);
    return ids;
  };
}
