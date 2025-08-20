---
'fumadocs-core': minor
'fumadocs-ui': minor
---

**Introduce page tree `fallback` API**

Page tree is a tree structure.

Previously, when an item is excluded from page tree, it is isolated entirely that you cannot display it at all.

With the new fallback API, isolated pages will go into `fallback` page tree instead:

```json
{
  "children": [
    {
      "type": "page",
      "name": "Introduction"
    }
  ],
  "fallback": {
    "children": [
      {
        "type": "page",
        "name": "Hidden Page"
      }
    ]
  }
}
```

Items in `fallback` are invisible unless you've opened its item.
