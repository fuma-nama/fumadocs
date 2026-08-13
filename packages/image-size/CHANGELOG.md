## @fumari/image-size@0.1.0

### Introduce `@fumari/image-size`, replacing `image-size` in `remarkImage`

A fork of [probe-image-size](https://github.com/nodeca/probe-image-size) with no dependencies of its own.

```ts
import { probe, imageSize } from '@fumari/image-size';

await probe('./public/banner.png'); // { width: 1200, height: 630, type: 'png', mime: 'image/png' }
await probe('https://example.com/banner.png', { timeout: 5000 });

imageSize(bytes); // the same result, or `null`
```

`remarkImage` now uses it in both `fumadocs-core` and `@fumadocs/satteri`. Remote images are no longer downloaded in full just to be measured, and redirects are followed. Sizes are always in pixels, so an SVG sized in `em` or `pt` is converted instead of being skipped. Remote requests also time out after 30 seconds by default.

One behaviour difference worth knowing: the supported formats are avif/heic/heif, bmp, gif, ico, jpeg, png, psd, svg, tiff and webp. Sizes for jxl, tga, pnm, dds, icns, cur, ktx and jp2 can no longer be resolved and go through `onError` instead.

Sequential scanning stops after 512 KB, but that never loses an image: the one format that stores its dimensions past that point — TIFF with a trailing IFD — is resolved by following the header's pointer with a targeted read, using an HTTP `Range` request for remote files (and skipping through the body when the server ignores ranges).
