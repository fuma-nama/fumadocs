---
'fumadocs-ui': major
---

**Refactor import paths for layouts**

**migrate:** Use

```ts
import { DocsLayout } from "fumadocs-ui/layouts/docs"

import { HomeLayout } from "fumadocs-ui/layouts/home"

import { BaseLayoutProps } from "fumadocs-ui/layouts/shared"
```

Instead of

```ts
import { DocsLayout } from "fumadocs-ui/layout"

import { HomeLayout } from "fumadocs-ui/home-layout"

import { HomeLayoutProps } from "fumadocs-ui/home-layout"
```
