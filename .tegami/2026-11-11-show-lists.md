---
packages:
  'fumadocs-core': patch
  '@fumadocs/satteri': patch
---

### Steps and tab groups across `<show>`

- Steps inside `<show>` are numbered with the steps around them, in the content and the table of contents.
- A code block inside `<show>` is a tab of the tab group around it.
- Fixed a heading like `## 1. Title` not becoming a step after a list of `###` steps.
- Sätteri `remarkSteps` supports steps inside a step, and is faster on pages without steps.
