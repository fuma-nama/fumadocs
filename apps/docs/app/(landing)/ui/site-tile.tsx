import type { ComponentProps, ReactNode, Ref } from 'react';
import Image from 'next/image';
import { cn } from '@/lib/cn';
import type { ShowcaseObject } from '@/lib/showcases';
import { BAYER4 } from '../lib/dither';
import { cssRgb } from '../lib/gl';
import { isDark } from '../lib/theme';

/** size of a printed dot in CSS px */
const DOT = 2;
/** steps of a dither crossfade, each one adds two of the 16 Bayer levels */
const STEPS = 8;

/**
 * Prints the screenshot on the canvas at its size, a dot a pixel: object-cover and centred like the
 * <img>, an ordered 4x4 dither in the theme's ink and paper. Returns the pixels it put.
 */
export function printDots(canvas: HTMLCanvasElement, image: HTMLImageElement): ImageData {
  const cols = canvas.width;
  const rows = canvas.height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  // the whole image goes in, a source rectangle would be in bitmap pixels while `naturalWidth` of
  // a `srcset` image is density-corrected
  const scale = Math.max(cols / image.naturalWidth, rows / image.naturalHeight);
  const width = image.naturalWidth * scale;
  const height = image.naturalHeight * scale;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(image, (cols - width) / 2, (rows - height) / 2, width, height);
  // dark dots take the darker theme colour, the rest the lighter one, so dark mode keeps tones
  const style = getComputedStyle(canvas);
  const ink = cssRgb(style.getPropertyValue('--lp-ink'));
  const paper = cssRgb(style.getPropertyValue('--lp-paper'));
  const [dot, ground] = isDark() ? [paper, ink] : [ink, paper];
  const pixels = ctx.getImageData(0, 0, cols, rows);
  const data = pixels.data;
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const i = (y * cols + x) * 4;
      const light = (0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2]) / 255;
      const color = light > (BAYER4[(y % 4) * 4 + (x % 4)] + 0.5) / 16 ? ground : dot;
      data[i] = color[0] * 255;
      data[i + 1] = color[1] * 255;
      data[i + 2] = color[2] * 255;
      data[i + 3] = 255;
    }
  }
  ctx.putImageData(pixels, 0, 0);
  return pixels;
}

/** a canvas's whole print, what it shows of it, and at what level of 16 */
const prints = new WeakMap<
  HTMLCanvasElement,
  { full: ImageData; shown: ImageData; level: number }
>();

/** prints the screenshot in 2px dots over the box it covers, once */
export function print(canvas: HTMLCanvasElement, image: HTMLImageElement) {
  const box = canvas.parentElement!;
  if (box.clientWidth === 0 || image.naturalWidth === 0) return;
  const cols = Math.ceil(box.clientWidth / DOT);
  const rows = Math.ceil(box.clientHeight / DOT);
  canvas.width = cols;
  canvas.height = rows;
  // exact dot sizes, the box clips the last partial dot
  canvas.style.width = `${cols * DOT}px`;
  canvas.style.height = `${rows * DOT}px`;

  const full = printDots(canvas, image);
  const shown = new ImageData(new Uint8ClampedArray(full.data), cols, rows);
  const level = prints.get(canvas)?.level ?? 16;
  prints.set(canvas, { full, shown, level: 16 });
  show(canvas, level);
}

/** Dither: shows the print in 4px cells whose Bayer threshold is under `level` */
export function show(canvas: HTMLCanvasElement, level: number) {
  const entry = prints.get(canvas);
  if (!entry || entry.level === level) return;
  entry.level = level;
  const { full, shown } = entry;
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  if (level === 16) return ctx.putImageData(full, 0, 0);
  const data = shown.data;
  for (let y = 0; y < shown.height; y++) {
    for (let x = 0; x < shown.width; x++) {
      data[(y * shown.width + x) * 4 + 3] =
        BAYER4[((y >> 1) & 3) * 4 + ((x >> 1) & 3)] < level ? 255 : 0;
    }
  }
  ctx.putImageData(shown, 0, 0);
}

/** the dither level `t` ms into a crossfade of `duration`, rising in `STEPS` steps */
export function level(t: number, duration: number): number {
  return (16 / STEPS) * Math.min(STEPS, Math.max(0, Math.floor((t / duration) * STEPS) + 1));
}

/** where a site lives, without the protocol or a trailing slash */
export function address(url: string): string {
  const { host, pathname } = new URL(url);
  return host + pathname.replace(/\/$/, '');
}

/** `name` cut to `budget` characters, ending on a word */
export function fit(name: string, budget: number): string {
  if (name.length <= budget) return name;
  const end = name.lastIndexOf(' ', budget - 1);
  return `${name.slice(0, end > 0 ? end : budget - 1)}…`;
}

interface SiteTileProps extends Omit<ComponentProps<'a'>, 'href' | 'children'> {
  site: ShowcaseObject;
  /** `sizes` of the screenshot */
  sizes: string;
  /** the title bar's text, the site's name by default */
  name?: ReactNode;
  nameRef?: Ref<HTMLSpanElement>;
  /** the title bar shows its stripes and boxes and the print stays hidden */
  printed?: boolean;
  /** a canvas over the screenshot for its 1-bit print, see `print()` */
  printable?: boolean;
}

/**
 * A real site as a window of the desktop: its name in the title bar, its screenshot below, which
 * can be printed in 1-bit on a canvas. A site without a screenshot shows its initial instead.
 */
export function SiteTile({
  site,
  sizes,
  name = site.name,
  nameRef,
  printed = true,
  printable = false,
  className,
  ...props
}: SiteTileProps) {
  const box = cn(
    'relative size-2.5 shrink-0 border border-lp-line-strong bg-lp-paper group-hover:invisible group-focus-visible:invisible',
    !printed && 'invisible',
  );

  return (
    <a
      {...props}
      href={site.url}
      target="_blank"
      rel="noreferrer noopener"
      className={cn(
        'group flex flex-col bg-lp-paper outline-offset-2 outline-lp-ink focus-visible:relative focus-visible:z-10 focus-visible:outline',
        className,
      )}
    >
      <span className="relative flex h-5 items-center gap-1 border-b border-lp-line-strong px-1 group-hover:bg-lp-ink group-hover:text-lp-paper group-focus-visible:bg-lp-ink group-focus-visible:text-lp-paper">
        {printed && (
          <span
            aria-hidden
            className="lp-pinstripe absolute inset-x-1 inset-y-0 group-hover:hidden group-focus-visible:hidden"
          />
        )}
        <span aria-hidden className={box} />
        <span
          ref={nameRef}
          className="relative mx-auto min-w-0 overflow-hidden bg-lp-paper px-1.5 font-mono text-[11px] leading-none whitespace-nowrap group-hover:bg-transparent group-focus-visible:bg-transparent"
        >
          {name}
        </span>
        <span aria-hidden className={box} />
      </span>
      {site.image ? (
        <span className="relative block aspect-[1.91/1] overflow-hidden">
          <Image src={site.image} alt="" fill sizes={sizes} className="object-cover" />
          {printable && (
            <canvas
              aria-hidden
              className={cn(
                'pointer-events-none absolute top-0 left-0 [image-rendering:pixelated]',
                printed && 'invisible',
              )}
            />
          )}
        </span>
      ) : (
        <span
          aria-hidden
          className="flex aspect-[1.91/1] items-center justify-center bg-lp-paper-2 group-hover:bg-lp-ink group-hover:text-lp-paper group-focus-visible:bg-lp-ink group-focus-visible:text-lp-paper"
        >
          <span data-glyph="" className="text-[88px] leading-none font-medium">
            {site.name[0]}
          </span>
        </span>
      )}
    </a>
  );
}
