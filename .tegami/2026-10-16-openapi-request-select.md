---
packages:
  'fumadocs-openapi': patch
---

### Example request select in the card title

- The select of example requests replaces the title of the example request card, its options show the descriptions of examples.
- `renderAPIExampleLayout()` gets the `selector` slot only with `renderAPIExampleUsageTabs()`.
- Options with descriptions line up their labels with the select.
