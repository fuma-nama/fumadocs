## @fumadocs/ai-chat@0.1.0

### New package: `@fumadocs/ai-chat`

The Ask AI chat for AI SDK: pass the result of `useChat()` to `AIChatProvider`, then render `AIChatPanel` in the `aiChat` option of docs layouts. Questions rest at the top while answers stream below, and Markdown is rendered block by block, so unclosed syntax never shows.

The `ai/*` components of the CLI install its source along with the integration, and the generated layout uses `AIChat`, `AIChatPanel`, `AIChatTrigger` and `useAIChat`.
