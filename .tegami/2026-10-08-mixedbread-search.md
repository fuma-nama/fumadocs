---
packages:
  'fumadocs-core': patch
  '@fumadocs/cli': patch
---

### Group Mixedbread results by page

`createMixedbreadSearchAPI()` returns each page once, followed by the headings its matched chunks start with, instead of a page for every chunk. Headings come from the `chunk_headings` of Mixedbread without `#` markers, which search dialogs now render as Markdown headings, and link to their anchors, including custom IDs like `[#id]`.

The Mixedbread template of Fumadocs CLI syncs with `mxbai store sync`, as `mxbai vs sync` is removed from Mixedbread CLI v2, and reads the API key from `MXBAI_API_KEY` like the Mixedbread SDK and CLI.
