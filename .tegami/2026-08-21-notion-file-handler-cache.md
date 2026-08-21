---
packages:
  npm:@fumadocs/notion:
    type: patch
---

## Remember verified file URLs in the Notion file handler

Every asset request cost between 2 and 34 Notion API calls, so a page with a handful of images tripped the rate limit with two concurrent visitors. The handler now remembers a verified signed URL per block until shortly before Notion's `expiry_time`.
