---
packages:
  '@fumadocs/story': minor
  '@fumadocs/language': patch
---

### Redesigned story controls

- Props are edited in rows like the OpenAPI playground, nested objects and arrays open in a panel with breadcrumbs.
- Reset the props to the defaults of the variant.
- `fixed` values hide their controls with the Vite plugin and Turbopack loader too.
- Switching back to a variant restores its default values.
- `getDefaultValue()` leaves optional properties unset, `typeToString()` prints enums as their members.
- Updated translation keys of the controls, see `@fumadocs/language` for the new ones.
