---
'fumadocs-core': patch
---

Fix infinite re-render where (1) a React transition is triggered, (2) the search dialog is inside `<Suspense />`. This causes the `loading` state to be `false` even after `setLoading(true)`, as transition will freeze state updates, and break the render-time state checks of `useDocsSearch()`.
