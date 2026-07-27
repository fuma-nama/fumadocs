---
packages:
  npm:fumadocs-core: patch
---

## Respect quality values in `isMarkdownPreferred`

`isMarkdownPreferred()` previously returned `true` whenever a Markdown media type appeared anywhere
in `Accept`, ignoring how the client ranked it. A request for `Accept: text/html;q=0.9, text/markdown;q=0.1`
was served Markdown even though it clearly preferred HTML.

It now compares the client's highest quality value for a Markdown type against its highest value for
HTML, and only prefers Markdown when Markdown ranks at least as high. Wildcards (`*/*`, `text/*`)
count towards HTML, so `Accept: */*` keeps receiving HTML.

A tie still prefers Markdown, so agents sending `Accept: text/html,text/markdown,text/plain,*/*;q=0.5`
are unaffected.

The negotiation examples and templates now also set `Vary: Accept` on the negotiated Markdown
response, so shared caches key on the header the representation was selected by.
