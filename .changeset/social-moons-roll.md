---
'fumadocs-typescript': major
---

**Use `createGenerator` API**

Create a generator instance:

```ts
import { createGenerator } from 'fumadocs-typescript';

const generator = createGenerator(tsconfig);
```

Refactor:

```tsx
import { remarkAutoTypeTable, createTypeTable } from 'fumadocs-typescript';

generateDocumentation('./file.ts', 'MyClass', fs.readFileSync('./file.ts').toString())
generateMDX('content', {...})
generateFiles({...})
const processor = createProcessor({
    remarkPlugins: [remarkAutoTypeTable],
});

const AutoTypeTable = createTypeTable()
return <AutoTypeTable {...props} />
```

To:

```tsx
import { AutoTypeTable, remarkAutoTypeTable } from "fumadocs-typescript";

generator.generateDocumentation({path: './file.ts'}, 'MyClass')
generateMDX(generator, 'content', { ... })
generateFiles(generator, { ... })
const processor = createProcessor({
    remarkPlugins: [
        [remarkAutoTypeTable, { generator }],
    ],
});

return <AutoTypeTable generator={generator} {...props} />
```

This ensure the compiler instance is always re-used.