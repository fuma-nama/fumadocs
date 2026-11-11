import Slugger from 'github-slugger';

function createSlugger(): (text: string) => string {
  const slugger = new Slugger();
  return (text) => slugger.slug(text);
}

/**
 * The IDs of the headings of a page for its props.
 *
 * @param ids - list the ID of each heading in document order: `slug` takes the parts of the text of a heading that
 * shows, a hidden heading has an empty ID
 * @param slugger - create the slug function of a page, called with the text of each heading that shows in document
 * order, so it can count duplicates
 */
export function createHeadingIds(
  ids: (props: object, slug: (parts: unknown[]) => string) => string[],
  slugger = createSlugger,
) {
  const cache = new WeakMap<object, string[]>();
  return (props: object): string[] => {
    let list = cache.get(props);
    if (list) return list;
    const slug = slugger();
    list = ids(props, (parts) => {
      let text = '';
      // like React, booleans and nullish values render nothing
      for (const part of parts)
        if (typeof part === 'string' || typeof part === 'number') text += part;
      // parts that render nothing leave the whitespace around them
      return slug(text.trim());
    });
    cache.set(props, list);
    return list;
  };
}
