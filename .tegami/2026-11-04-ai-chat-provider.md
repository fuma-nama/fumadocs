---
packages:
  'fumadocs-ui': patch
  '@fumadocs/base-ui': patch
---

### AI chat provider

- Added `AIChatOptionsProvider` to `layouts/shared`: docs layouts without an `aiChat` prop dock the AI chat it provides.
- The docs and notebook layouts add a floating "Ask AI" button for the chat of `AIChatOptionsProvider`.
