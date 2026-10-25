/** clack's symbols, drawn by hand: the Google Fonts build of JetBrains Mono has no box drawing or geometric shapes */
const SYMBOLS = '│└┌◆◇●○◒◐◓◑█↑↓•';
const ASCII = 95;

export const ATLAS_COLUMNS = 16;
const GLYPHS = ASCII + SYMBOLS.length;

export function glyphOf(char: string): number {
  const code = char.charCodeAt(0);
  if (code >= 32 && code < 127) return code - 32;
  const i = SYMBOLS.indexOf(char);
  return i === -1 ? 0 : ASCII + i;
}

interface Atlas {
  /** white glyphs on black, one cell per glyph */
  canvas: HTMLCanvasElement;
  /** ink coverage of each glyph, 0 to 255 */
  density: Uint8Array;
  /** cell pitch and glyph box in texels */
  metrics: readonly [pitchW: number, pitchH: number, glyphW: number, glyphH: number];
}

/** terminal cells of `family` (a monospaced font with a 0.6em advance) at 1.25 line height */
export function createAtlas(family: string): Atlas {
  const size = 56;
  const w = size * 0.6;
  const h = Math.round(size * 1.25);
  const pitchW = Math.ceil(w) + 2;
  const pitchH = h + 2;
  const canvas = document.createElement('canvas');
  canvas.width = ATLAS_COLUMNS * pitchW;
  canvas.height = Math.ceil(GLYPHS / ATLAS_COLUMNS) * pitchH;
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#fff';
  ctx.strokeStyle = '#fff';
  ctx.font = `${size}px ${family}`;
  const metrics = ctx.measureText('M');
  const ascent = metrics.fontBoundingBoxAscent;
  const baseline = (h - ascent - metrics.fontBoundingBoxDescent) / 2 + ascent;
  const stroke = size * 0.085;
  ctx.lineWidth = stroke;

  for (let i = 0; i < GLYPHS; i++) {
    const x = (i % ATLAS_COLUMNS) * pitchW + 1;
    const y = Math.floor(i / ATLAS_COLUMNS) * pitchH + 1;
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, w, h);
    ctx.clip();
    if (i < ASCII) ctx.fillText(String.fromCharCode(32 + i), x, y + baseline);
    else symbol(ctx, SYMBOLS[i - ASCII], x, y, w, h, y + baseline - size * 0.34, size, stroke);
    ctx.restore();
  }

  const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
  const density = new Uint8Array(GLYPHS);
  for (let i = 0; i < GLYPHS; i++) {
    const x0 = (i % ATLAS_COLUMNS) * pitchW + 1;
    const y0 = Math.floor(i / ATLAS_COLUMNS) * pitchH + 1;
    let sum = 0;
    for (let y = y0; y < y0 + h; y++) {
      for (let x = x0; x < x0 + Math.floor(w); x++) sum += pixels[(y * canvas.width + x) * 4];
    }
    density[i] = Math.round(sum / (h * Math.floor(w)));
  }
  return { canvas, density, metrics: [pitchW, pitchH, w, h] };
}

function symbol(
  ctx: CanvasRenderingContext2D,
  char: string,
  x: number,
  y: number,
  w: number,
  h: number,
  /** vertical centre of symbols, on the math axis */
  axis: number,
  size: number,
  stroke: number,
) {
  const cx = x + w / 2;
  const cy = y + h / 2;
  const half = stroke / 2;
  switch (char) {
    case '│':
      ctx.fillRect(cx - half, y, stroke, h);
      return;
    case '└':
      ctx.fillRect(cx - half, y, stroke, h / 2 + half);
      ctx.fillRect(cx - half, cy - half, x + w - cx + half, stroke);
      return;
    case '┌':
      ctx.fillRect(cx - half, cy - half, stroke, h / 2 + half);
      ctx.fillRect(cx - half, cy - half, x + w - cx + half, stroke);
      return;
    case '◆':
    case '◇': {
      const r = size * 0.32;
      ctx.beginPath();
      ctx.moveTo(cx, axis - r);
      ctx.lineTo(cx + r, axis);
      ctx.lineTo(cx, axis + r);
      ctx.lineTo(cx - r, axis);
      ctx.closePath();
      if (char === '◆') ctx.fill();
      else {
        ctx.lineJoin = 'miter';
        ctx.stroke();
      }
      return;
    }
    case '█':
      ctx.fillRect(x, y, w, h);
      return;
    case '•':
      ctx.beginPath();
      ctx.arc(cx, axis, size * 0.1, 0, Math.PI * 2);
      ctx.fill();
      return;
    case '↑':
    case '↓': {
      const dir = char === '↑' ? -1 : 1;
      const r = size * 0.3;
      ctx.fillRect(cx - half, axis - r, stroke, r * 2);
      ctx.beginPath();
      ctx.moveTo(cx - r * 0.75, axis + dir * (r - r * 0.75));
      ctx.lineTo(cx, axis + dir * r);
      ctx.lineTo(cx + r * 0.75, axis + dir * (r - r * 0.75));
      ctx.stroke();
      return;
    }
  }

  // circles: ● ○ and the spinner's half-filled ◒ ◐ ◓ ◑
  const r = size * 0.27;
  ctx.beginPath();
  ctx.arc(cx, axis, r - (char === '●' ? 0 : half), 0, Math.PI * 2);
  if (char === '●') {
    ctx.fill();
    return;
  }
  ctx.stroke();
  if (char === '○') return;
  const start = { '◒': 0, '◐': Math.PI / 2, '◓': Math.PI, '◑': -Math.PI / 2 }[char] ?? 0;
  ctx.beginPath();
  ctx.arc(cx, axis, r, start, start + Math.PI);
  ctx.closePath();
  ctx.fill();
}
