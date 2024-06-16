---
'fumadocs-core': minor
---

**Support writing code blocks as a `<Tab />` element.**

````mdx
import { Tabs } from "fumadocs-ui/components/tabs";

<Tabs items={["Tab 1", "Tab 2"]}>

```js tab="Tab 1"
console.log("Hello")
```

```js tab="Tab 2"
console.log("Hello")
```

</Tabs>
````

This is same as wrapping the code block in a `<Tab />` component.
