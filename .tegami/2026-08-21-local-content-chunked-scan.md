---
packages:
  npm:@fumadocs/local-content:
    type: patch
---

## Read files in bounded chunks during a cold scan

`getFiles()` awaits each chunk before starting the next, instead of starting the entire tree concurrently.
