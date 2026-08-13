# @fumari/image-size

Read image dimensions without downloading or reading the whole image. No dependencies.

Supports AVIF/HEIC/HEIF, BMP, GIF, ICO, JPEG, PNG, PSD, SVG, TIFF and WebP.

```ts
import { probe, imageSize } from '@fumari/image-size';

// reads only as far as the header
await probe('./public/banner.png'); // { width: 1200, height: 630, type: 'png', mime: 'image/png' }

// aborts the request once the size is known; times out after 30s
// by default (pass `timeout: 0` to wait forever)
await probe('https://example.com/banner.png', { timeout: 5000 });

// already have the bytes
imageSize(new Uint8Array(buffer)); // the same result, or `null`
```

`probe` throws an `ImageSizeError` when the source can't be read or isn't a supported
format; `imageSize` returns `null` instead, so a partial image can be retried once more
bytes arrive.

Sizes are always in pixels — SVG lengths given in other CSS units are converted, assuming
the default 16px font size for `em`/`ex`.

## Credit

A fork of [probe-image-size](https://github.com/nodeca/probe-image-size) by Nodeca, whose
format parsers this is derived from. It drops the HTTP client and stream machinery in
favour of `fetch` and `node:fs`, along with EXIF orientation and the unit system.
