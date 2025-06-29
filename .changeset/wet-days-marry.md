---
'fumadocs-docgen': minor
'fumadocs-core': minor
'fumadocs-ui': minor
---

**Redesigned Codeblock Tabs**

Instead of relying on `Tabs` component, it supports a dedicated tabs component for codeblocks:

```tsx
<CodeBlockTabs>
    <CodeBlockTabsList>
        <CodeBlockTabsTrigger value='value'>
            Name
        </CodeBlockTabsTrigger>
    </CodeBlockTabsList>
    <CodeBlockTab value='value' asChild>
        <CodeBlock>
            ...
        </CodeBlock>
    </CodeBlockTab>
</CodeBlockTabs>
```

The old usage is not deprecated, you can still use them while Fumadocs' remark plugins will generate codeblock tabs using the new way.
