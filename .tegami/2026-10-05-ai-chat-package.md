---
packages:
  '@fumadocs/ai-chat': minor
  '@fumadocs/cli': patch
---

## New package: `@fumadocs/ai-chat`

A composable chat UI for Ask AI integrations: conversation with pinned questions and follow scrolling, composer, messages, sources, activity rows, suggestions and error notices. `ChatMarkdown` renders streamed answers block by block, completing unclosed syntax so raw `**` or half-typed links never show. The `ai/*` components of the CLI are built on it, and the CLI adds its Tailwind CSS preset:

```css
@import '@fumadocs/ai-chat/css/preset.css';
```
