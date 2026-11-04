---
packages:
  'fumadocs-ui': patch
  '@fumadocs/base-ui': patch
  '@fumadocs/ai-chat': patch
---

### AI chat provider

- Added `AIChatOptionsProvider` to `layouts/shared`: docs layouts without an `aiChat` prop dock the AI chat it provides.
- `AIChatTrigger` of `@fumadocs/ai-chat` announces whether the chat is open.
