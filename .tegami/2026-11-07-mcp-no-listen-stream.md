---
packages:
  '@fumadocs/cli': patch
---

### Keep MCP routes from holding serverless functions open

- The generated MCP route no longer lets clients open a stream that lasts until the function times out.
