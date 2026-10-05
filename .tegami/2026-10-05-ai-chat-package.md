---
packages:
  '@fumadocs/ai-chat': minor
  '@fumadocs/cli': patch
---

## New package: `@fumadocs/ai-chat`

The Ask AI chat for AI SDK: pass the result of `useChat()` to `AIChatProvider`, then render `AIChatPanel` in the `aiChat` option of docs layouts. Questions rest at the top while answers stream below, and Markdown is rendered block by block, so unclosed syntax never shows.

The `ai/*` components of the CLI install its source along with the integration, and the generated layout uses `AIChat`, `AIChatPanel`, `AIChatTrigger` and `useAIChat`.
