---
"fumadocs-ui": major
---

Replace `nav.links` option with secondary links

why: A more straightforward API design

migrate:

```diff
<DocsLayout
+  links={[
+    {
+      type: 'secondary',
+      text: 'Github',
+      url: 'https://github.com',
+      icon: <GithubIcon />,
+      external: true,
+    },
+  ]}
-  nav={{
-    links: [
-      {
-        icon: <GithubIcon />,
-        href: 'https://github.com',
-        label: 'Github',
-        external: true,
-      },
-    ],
-  }}
>
  {children}
</DocsLayout>
```