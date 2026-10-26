import { BEAT } from '../../lib/motion';
import { setStatus } from '../../lib/status';

const GLYPHS = '#-*>[]{}/=+fumadocs';
const WORD = 'Fumadocs';
/** simulation steps per second, a grain falls one cell per step */
const RATE = 40;
/** a full wordmark (one that stopped filling) holds for this long, then drains */
const HOLD = 4 * BEAT;

const EMPTY = 0;
const GHOST = 1;
/** how a grain is drawn: falling (light), at rest (ink), pushed (on the active yellow) */
const FALLING = 0;
const RESTING = 1;
const PUSHED = 2;

/**
 * The footer wordmark as an hourglass: glyphs fall on a character grid and settle only inside
 * the letters, the pointer pushes them away, and a full word drains and fills again.
 */
export function createSand(host: HTMLElement): () => void {
  const canvas = host.querySelector('canvas')!;
  const ctx = canvas.getContext('2d')!;
  const sprites = document.createElement('canvas');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const root = document.documentElement;

  let cols = 0;
  let rows = 0;
  let cellW = 0;
  let cellH = 0;
  let dpr = 1;
  /** 1 where the cell is inside a letter */
  let inside = new Uint8Array(0);
  /** glyph index + 1 of the grain in a cell, 0 when empty */
  let grain = new Uint8Array(0);
  /** steps since the grain last moved, or until a pushed grain cools down */
  let rest = new Uint8Array(0);
  let hot = new Uint8Array(0);
  /** what is on the canvas: EMPTY, GHOST or 2 + glyph * 3 + look */
  let drawn = new Uint8Array(0);
  /** columns over a letter, where grains are dropped */
  let spawn = new Uint16Array(0);
  /** per column, the row of its lowest empty letter cell, -1 when the column is full */
  let hole = new Int16Array(0);
  let capacity = 0;
  let filled = 0;

  let visible = false;
  let raf = 0;
  let last = 0;
  let steps = 0;
  let parity = 0;
  let draining = false;
  /** the most grains the word held this round, and when it last got more */
  let best = 0;
  let bestAt = 0;
  let pointer = -1;
  let ready = false;
  let disposed = false;
  let ghost = '';

  function family() {
    return getComputedStyle(host).getPropertyValue('--font-geist-pixel').trim() || 'monospace';
  }

  function layout() {
    const width = host.clientWidth;
    const height = host.clientHeight;
    if (width === 0 || height === 0) return;
    const narrow = width < 640;
    cols = Math.floor(width / (narrow ? 5 : 9));
    // the columns stretch a fraction of a pixel to fill the width, so the word meets both gutters
    cellW = width / cols;
    cellH = narrow ? 6 : 12;
    rows = Math.floor(height / cellH);
    dpr = Math.min(window.devicePixelRatio, 2);
    canvas.width = Math.round(cols * cellW * dpr);
    canvas.height = Math.round(rows * cellH * dpr);
    canvas.style.width = `${cols * cellW}px`;
    canvas.style.height = `${rows * cellH}px`;

    // the wordmark mask: its ink spans the gutters, sitting near the bottom, sampled at cell centres
    const font = family();
    const mask = new OffscreenCanvas(width, height);
    const m = mask.getContext('2d', { willReadFrequently: true })!;
    m.font = `100px ${font}`;
    const metrics = m.measureText(WORD);
    const fit = Math.min(
      width / (metrics.actualBoundingBoxLeft + metrics.actualBoundingBoxRight),
      (height * 0.74) / metrics.actualBoundingBoxAscent,
    );
    m.font = `${100 * fit}px ${font}`;
    m.fillText(
      WORD,
      metrics.actualBoundingBoxLeft * fit,
      height - Math.max(cellH * 2, height * 0.08),
    );
    const alpha = m.getImageData(0, 0, width, height).data;
    inside = new Uint8Array(cols * rows);
    grain = new Uint8Array(cols * rows);
    rest = new Uint8Array(cols * rows).fill(255);
    hot = new Uint8Array(cols * rows);
    drawn = new Uint8Array(cols * rows);
    capacity = 0;
    const over: number[] = [];
    for (let x = 0; x < cols; x++) {
      let column = false;
      for (let y = 0; y < rows; y++) {
        const i = y * cols + x;
        const sx = Math.floor((x + 0.5) * cellW);
        const sy = Math.floor((y + 0.5) * cellH);
        if (alpha[(sy * width + sx) * 4 + 3] > 127) {
          inside[i] = 1;
          capacity++;
          column = true;
        }
      }
      if (column) over.push(x);
    }
    spawn = Uint16Array.from(over);
    hole = new Int16Array(cols);
    filled = 0;
    draining = false;
    best = 0;
    if (reduce.matches) {
      for (let i = 0; i < inside.length; i++)
        if (inside[i]) grain[i] = 1 + ((Math.imul(i, 2654435761) >>> 16) % GLYPHS.length);
      filled = capacity;
    }
    paintSprites();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    draw(true);
    ready = true;
  }

  function paintSprites() {
    const style = getComputedStyle(host);
    ghost = style.getPropertyValue('--lp-ink-2').trim();
    const w = Math.round(cellW * dpr);
    const h = Math.round(cellH * dpr);
    sprites.width = w * GLYPHS.length;
    sprites.height = h * 3;
    const s = sprites.getContext('2d')!;
    s.clearRect(0, 0, sprites.width, sprites.height);
    s.fillStyle = style.getPropertyValue('--lp-yellow').trim();
    s.fillRect(0, PUSHED * h, sprites.width, h);
    s.font = `${Math.round(cellH * 0.92 * dpr)}px ${family()}`;
    s.textAlign = 'center';
    s.textBaseline = 'middle';
    const colors = [ghost, style.getPropertyValue('--lp-ink').trim(), '#121210'];
    for (let look = 0; look < 3; look++) {
      s.fillStyle = colors[look];
      for (let g = 0; g < GLYPHS.length; g++) {
        s.fillText(GLYPHS[g], g * w + w / 2, look * h + h / 2 + dpr);
      }
    }
  }

  /** redraw the cells whose content changed */
  function draw(all = false) {
    const w = Math.round(cellW * dpr);
    const h = Math.round(cellH * dpr);
    const dot = Math.max(2, Math.round(2 * dpr));
    for (let i = 0; i < grain.length; i++) {
      const look = hot[i] > 0 ? PUSHED : rest[i] > 1 ? RESTING : FALLING;
      const want = grain[i] ? 2 + (grain[i] - 1) * 3 + look : inside[i] ? GHOST : EMPTY;
      if (!all && want === drawn[i]) continue;
      drawn[i] = want;
      const x = Math.round((i % cols) * cellW * dpr);
      const y = Math.floor(i / cols) * h;
      ctx.clearRect(x, y, w, h);
      if (want === GHOST) {
        ctx.fillStyle = ghost;
        ctx.fillRect(x + Math.floor((w - dot) / 2), y + Math.floor((h - dot) / 2), dot, dot);
      } else if (want > GHOST) {
        const g = Math.floor((want - 2) / 3);
        ctx.drawImage(sprites, g * w, ((want - 2) % 3) * h, w, h, x, y, w, h);
      }
    }
  }

  function move(from: number, to: number) {
    grain[to] = grain[from];
    grain[from] = 0;
    hot[to] = hot[from];
    hot[from] = 0;
    rest[to] = 0;
    if (inside[to] && !inside[from]) filled++;
    else if (!inside[to] && inside[from]) filled--;
  }

  function step(now: number) {
    // two new grains a step, over the letters
    for (let n = 0; n < 2 && !draining && spawn.length > 0; n++) {
      const x = spawn[Math.floor(Math.random() * spawn.length)];
      if (!grain[x]) grain[x] = 1 + Math.floor(Math.random() * GLYPHS.length);
    }

    if (pointer >= 0) push();

    for (let x = 0; x < cols; x++) {
      let y = rows - 1;
      while (y >= 0 && !(inside[y * cols + x] && !grain[y * cols + x])) y--;
      hole[x] = y;
    }

    parity ^= 1;
    for (let y = rows - 1; y >= 0; y--) {
      for (let k = 0; k < cols; k++) {
        const x = parity ? k : cols - 1 - k;
        const i = y * cols + x;
        if (!grain[i]) continue;
        if (hot[i] > 0) hot[i]--;
        if (rest[i] < 255) rest[i]++;
        if (y === rows - 1) {
          if (inside[i] && !draining) continue;
          grain[i] = 0;
          if (inside[i]) filled--;
          continue;
        }
        const below = i + cols;
        // a letter's lower edge is a floor, unless a stroke further down that column still has room
        const held = inside[i] === 1 && !draining;
        if (!grain[below] && (inside[below] || !held || hole[x] > y)) {
          move(i, below);
          continue;
        }
        const dx = Math.random() < 0.5 ? -1 : 1;
        const a = below + dx;
        const b = below - dx;
        if (x + dx >= 0 && x + dx < cols && !grain[a] && (inside[a] || !held || hole[x + dx] > y))
          move(i, a);
        else if (
          x - dx >= 0 &&
          x - dx < cols &&
          !grain[b] &&
          (inside[b] || !held || hole[x - dx] > y)
        )
          move(i, b);
        // blocked in the air: dissolve, nothing piles up outside the letters
        else if (!inside[i]) grain[i] = 0;
      }
    }

    // some cells are pockets no grain can reach: full is when the word stops filling
    if (filled > best) {
      best = filled;
      bestAt = now;
    } else if (!draining && filled > capacity * 0.85 && now - bestAt > HOLD) draining = true;
    if (draining && filled <= 0) {
      draining = false;
      best = 0;
    }
  }

  /** grains around the pointer jump one cell away from it */
  function push() {
    const px = pointer % cols;
    const py = Math.floor(pointer / cols);
    const r = 3;
    for (let y = Math.max(0, py - r); y <= Math.min(rows - 1, py + r); y++) {
      for (let x = Math.max(0, px - r); x <= Math.min(cols - 1, px + r); x++) {
        const i = y * cols + x;
        if (!grain[i] || (x - px) ** 2 + (y - py) ** 2 > r * r) continue;
        const nx = x + Math.sign(x - px || (Math.random() < 0.5 ? -1 : 1));
        const ny = y + Math.sign(y - py);
        if (nx < 0 || nx >= cols || ny < 0 || ny >= rows) continue;
        const to = ny * cols + nx;
        if (grain[to]) continue;
        move(i, to);
        hot[to] = 10;
      }
    }
  }

  function frame(now: number) {
    raf = 0;
    if (!visible || !ready || reduce.matches) return;
    const dt = Math.min(250, now - (last || now));
    last = now;
    steps += (dt * RATE) / 1000;
    while (steps >= 1) {
      step(now);
      steps--;
    }
    draw();
    raf = requestAnimationFrame(frame);
  }

  function start() {
    if (raf === 0 && visible && !reduce.matches) {
      last = 0;
      raf = requestAnimationFrame(frame);
    }
  }

  function onPointer(event: PointerEvent) {
    if (!ready) return;
    const box = canvas.getBoundingClientRect();
    const x = Math.floor((event.clientX - box.left) / cellW);
    const y = Math.floor((event.clientY - box.top) / cellH);
    pointer = x >= 0 && x < cols && y >= 0 && y < rows ? y * cols + x : -1;
  }

  function onLeave() {
    pointer = -1;
  }

  function onTheme() {
    if (!ready) return;
    paintSprites();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    draw(true);
  }

  const resize = new ResizeObserver(() => {
    if (!disposed && document.fonts.status === 'loaded') layout();
  });
  const visibility = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    if (visible) {
      setStatus('end of sheet');
      start();
    } else {
      cancelAnimationFrame(raf);
      raf = 0;
    }
  });
  const theme = new MutationObserver(onTheme);
  const onPreference = () => {
    layout();
    start();
  };

  void document.fonts.load(`100px ${family()}`).then(() => {
    if (disposed) return;
    layout();
    resize.observe(host);
    start();
  });
  visibility.observe(host);
  theme.observe(root, { attributes: true, attributeFilter: ['class'] });
  reduce.addEventListener('change', onPreference);
  host.addEventListener('pointermove', onPointer);
  host.addEventListener('pointerleave', onLeave);

  return () => {
    disposed = true;
    cancelAnimationFrame(raf);
    resize.disconnect();
    visibility.disconnect();
    theme.disconnect();
    reduce.removeEventListener('change', onPreference);
    host.removeEventListener('pointermove', onPointer);
    host.removeEventListener('pointerleave', onLeave);
  };
}
