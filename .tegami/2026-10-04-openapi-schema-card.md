---
packages:
  'fumadocs-openapi': minor
  '@fumadocs/asyncapi': patch
  '@fumadocs/graphql': patch
  '@fumadocs/language': patch
---

### Schema UI in cards

Nested schemas open in a card instead of a popover, navigated with breadcrumbs on top of it. Request bodies and responses render in the card directly, a property opens its card below itself.

- Panels slide in from the side they are navigated to, the page scrolls back to the breadcrumbs after navigating.
- Breadcrumbs that don't fit collapse into a menu, keeping the first crumb and the ones closest to the current schema.
- The union selector moves next to the breadcrumbs, the filter into the top of the card. In narrow cards, the filter takes a row of its own.
- Rows are more compact, enum values and constraints are shown as tags.
- The Schema UI client props accept `selector`, shown above the breadcrumbs, and `actions`, shown next to the filter.

On API pages:

- The media type of request bodies and responses is selected in the top of their cards.
- Authorization fields start with where they are sent, like `header` or `query`. The security requirement is selected in the top of their card.
- Parameters and authorization are grouped in cards.
- Responses are tabs of their status codes instead of accordions, a link to a response selects its tab.
- Callbacks open in a dialog instead of expanding in the page, with their full URL on top.
- Runtime expressions in routes, like `{$request.body#/url}`, are highlighted as a whole.
- TypeScript definitions are copied from a button in the top of the body and response cards.
