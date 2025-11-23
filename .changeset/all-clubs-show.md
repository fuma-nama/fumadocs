---
'fumadocs-ui': minor
---

**No longer expose layout components**

This includes Root Toggle, Language Toggle, Theme Toggle etc.

It allows Fumadocs UI to change these components without introducing breaking changes over existing customizations.

If you're using the removed components, consider overriding the layout components with yours, or use Fumadocs CLI add/customize command.
