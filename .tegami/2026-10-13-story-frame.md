---
packages:
  '@fumadocs/story': minor
---

### Story frames

- New `frame` option of `defineStory()`, renders components filling the viewport (e.g. layouts) in an iframe, scaled to fit the panel. Its `Container` wraps the frame, like a window.
- `story.Frame` renders the component on the frame page, with the arguments from the story panel.
- `useStoryFrame()` connects your own panel to the frame.
