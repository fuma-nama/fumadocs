---
'fumadocs-ui': major
---

**Replace <LanguageSelect /> component with <LanguageToggle />**

**migrate:**

Remove your `<LanguageSelect />` component from the layout. Enable the new language toggle with: 

```tsx
import { DocsLayout } from 'fumadocs-ui/layout';
 
export default function Layout({ children }: { children: React.ReactNode }) {
  return <DocsLayout i18n>{children}</DocsLayout>;
}
```