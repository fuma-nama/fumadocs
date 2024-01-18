import type { HProperties } from './remark-heading';

// We copied this from 'mdast-util-to-hast' because the build fails without this
declare module 'mdast' {
  interface Data {
    /**
     * Field supported by `mdast-util-to-hast` to signal that a node should
     * result in an element with these properties.
     *
     * When this is defined, when an element is created, these properties will
     * be used.
     */
    hProperties?: HProperties | undefined;
  }
}
