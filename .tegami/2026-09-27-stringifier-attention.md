---
packages:
  'fumadocs-core': patch
---

### Fix infinite recursion in the MDX stringifier with `mdast-util-to-markdown@2.1.3`

The stringifier wraps every `toMarkdown` handler but dropped their `attention` and `peek` properties, which `mdast-util-to-markdown@2.1.3` relies on to serialize bold and italic text. Pages containing them overflowed the stack during build.
