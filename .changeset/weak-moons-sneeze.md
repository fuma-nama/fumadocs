---
'fumadocs-core': minor
---

**Support code block tabs without hardcoding `<Tabs />` items**

**migrate:** Use the `remarkCodeTab` plugin.

**before:**

````mdx
import { Tab, Tabs } from 'fumadocs-ui/components/tabs';

<Tabs items={["Tab 1", "Tab 2"]}>

```ts tab
console.log('A');
```

```ts tab
console.log('B');
```

</Tabs>
````

**after:**

````mdx
import { Tab, Tabs } from 'fumadocs-ui/components/tabs';

```ts tab="Tab 1"
console.log('A');
```

```ts tab="Tab 2"
console.log('B');
```
````
