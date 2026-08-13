import type { Parser } from '../types';

// the root element must be the SVG itself, so SVG embedded in HTML is skipped
const SVG_TAG_RE = /^<([-_.:a-zA-Z0-9]+:)?svg\s/;
// the leading `[^-]` keeps `stroke-width` from matching
const SVG_WIDTH_RE = /[^-]\bwidth="([^%]+?)"|[^-]\bwidth='([^%]+?)'/;
const SVG_HEIGHT_RE = /\bheight="([^%]+?)"|\bheight='([^%]+?)'/;
const SVG_VIEWBOX_RE = /\bview[bB]ox="(.+?)"|\bview[bB]ox='(.+?)'/;
const SVG_UNITS_RE = /in$|mm$|cm$|pt$|pc$|px$|em$|ex$/;

/**
 * CSS absolute lengths, in pixels. `em`/`ex` assume the 16px default font size,
 * which is the best guess available without rendering the document.
 */
const UNITS: Record<string, number> = {
  px: 1,
  in: 96,
  cm: 96 / 2.54,
  mm: 96 / 25.4,
  pt: 96 / 72,
  pc: 16,
  em: 16,
  ex: 8,
};

const decoder = new TextDecoder('latin1');

function isWhiteSpace(chr: number): boolean {
  return chr === 0x20 || chr === 0x09 || chr === 0x0d || chr === 0x0a;
}

/** matches the `[-_.:a-zA-Z0-9]` element name class */
function isNameStart(chr: number): boolean {
  return (
    (chr >= 0x61 && chr <= 0x7a) || // a-z
    (chr >= 0x41 && chr <= 0x5a) || // A-Z
    (chr >= 0x30 && chr <= 0x39) || // 0-9
    chr === 0x2d || // -
    chr === 0x5f || // _
    chr === 0x2e || // .
    chr === 0x3a // :
  );
}

/**
 * The first element-like tag, skipping `<?` declarations and `<!` directives.
 *
 * A single forward scan — the obvious regex (`/<[name][^>]*>/`) backtracks over
 * `[^>]*` at every candidate and turns quadratic on `<`-riddled non-XML input.
 */
function rootTag(str: string): string | undefined {
  for (let lt = str.indexOf('<'); lt !== -1; lt = str.indexOf('<', lt + 1)) {
    if (!isNameStart(str.charCodeAt(lt + 1))) continue;

    const gt = str.indexOf('>', lt);
    // an unclosed tag can't be judged yet, wait for more data
    if (gt === -1) return;
    return str.slice(lt, gt + 1);
  }
}

function canBeSvg(data: Uint8Array): boolean {
  let i = 0;

  // byte order mark
  if (data[0] === 0xef && data[1] === 0xbb && data[2] === 0xbf) i = 3;
  while (i < data.length && isWhiteSpace(data[i])) i++;

  if (i === data.length) return false;
  return data[i] === 0x3c; /* < */
}

/** Filters out NaN, Infinity and non-positive values. */
function isFinitePositive(value: number): boolean {
  return Number.isFinite(value) && value > 0;
}

function unitOf(str: string): string {
  return str.match(SVG_UNITS_RE)?.[0] ?? 'px';
}

/** Length in pixels, or `NaN` when it isn't a usable number. */
function toPixels(str: string | undefined): number {
  if (!str) return Number.NaN;
  return Number.parseFloat(str) * UNITS[unitOf(str)];
}

export const svg: Parser = (data) => {
  if (!canBeSvg(data)) return;

  // latin1 maps every byte to the same code point ascii would, and the
  // attributes we look for never contain multi-byte characters
  const str = decoder.decode(data);

  const svgTag = rootTag(str);
  if (!svgTag || !SVG_TAG_RE.test(svgTag)) return;

  const widthAttr = svgTag.match(SVG_WIDTH_RE);
  const heightAttr = svgTag.match(SVG_HEIGHT_RE);
  const viewBoxAttr = svgTag.match(SVG_VIEWBOX_RE);

  const rawWidth = widthAttr?.[1] || widthAttr?.[2];
  const rawHeight = heightAttr?.[1] || heightAttr?.[2];
  const rawViewBox = viewBoxAttr?.[1] || viewBoxAttr?.[2];

  const width = toPixels(rawWidth);
  const height = toPixels(rawHeight);

  // both dimensions given outright
  if (rawWidth && rawHeight) {
    if (!isFinitePositive(width) || !isFinitePositive(height)) return;
    return { width, height, type: 'svg', mime: 'image/svg+xml' };
  }

  // otherwise derive the missing one from the viewBox ratio
  const parts = (rawViewBox || '').split(' ');
  const vbWidth = Number.parseFloat(parts[2]);
  const vbHeight = Number.parseFloat(parts[3]);

  if (!isFinitePositive(vbWidth) || !isFinitePositive(vbHeight)) return;
  // the viewBox is a single coordinate system, mixed units make no sense
  if (unitOf(parts[2]) !== unitOf(parts[3])) return;

  const ratio = vbWidth / vbHeight;

  if (rawWidth) {
    if (!isFinitePositive(width)) return;
    return { width, height: width / ratio, type: 'svg', mime: 'image/svg+xml' };
  }

  if (rawHeight) {
    if (!isFinitePositive(height)) return;
    return { width: height * ratio, height, type: 'svg', mime: 'image/svg+xml' };
  }

  return {
    width: vbWidth * UNITS[unitOf(parts[2])],
    height: vbHeight * UNITS[unitOf(parts[3])],
    type: 'svg',
    mime: 'image/svg+xml',
  };
};
