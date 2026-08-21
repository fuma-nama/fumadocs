## @fumadocs/notion@0.2.1

### Remember verified file URLs in the Notion file handler

Every asset request cost between 2 and 34 Notion API calls, so a page with a handful of images tripped the rate limit with two concurrent visitors. The handler now remembers a verified signed URL per block until shortly before Notion's `expiry_time`.

### Do not cache rejected promises

The dynamic loader's `files()`, Notion's page `load()`, `createFromSource`'s index build, and Shiki factory init retry on the next call after a transient failure, instead of returning the same rejection forever.

## @fumadocs/notion@0.2.0

### Support Notion integration

Use Notion as content source.
