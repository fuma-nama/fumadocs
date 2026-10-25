import { parts } from './data';
import { PAGE } from './camera';

/** where a part's label sits around the page: beside it, or above it */
type Side = 'left' | 'top' | 'right';

const SIDES: Record<string, Side> = {
  navbar: 'left',
  search: 'left',
  'page tree': 'left',
  sidebar: 'left',
  title: 'top',
  'table of contents': 'top',
  callout: 'right',
  'code block': 'right',
};

export type Rect = readonly [x: number, y: number, width: number, height: number];

/** the parts' boxes in the page as rendered, page px; the figure measures them again on mount */
export const RECTS: Record<string, Rect> = {
  navbar: [16, 16, 235, 30],
  search: [16, 58, 235, 36],
  'page tree': [8, 118, 251, 36],
  sidebar: [0, 0, 268, 500],
  title: [300, 56, 369, 42],
  'table of contents': [701, 44, 256, 20],
  callout: [300, 206, 369, 94],
  'code block': [300, 404, 369, 82.5],
};

/** from the page's edge to a label */
const OUT = 28;
/** from a label to its leader */
const GAP = 12;
/** the middle of a label's first line, where a side leader meets it */
const LINE = 9;
/** a label's height: its name and its API */
const LABEL = 36;

export interface Placement {
  name: string;
  api: string;
  side: Side;
  /**
   * The label's corner on the page's side: its top right for `left`, its bottom left for `top`,
   * its top left for `right`.
   */
  label: [number, number];
  leader: string;
  /** where the leader ends on the part */
  dot: [number, number];
}

function anchor(name: string, [x, y, w, h]: Rect): [number, number] {
  switch (name) {
    // the sidebar's own surface, below its items
    case 'sidebar':
      return [x + 24, y + h * 0.84];
    case 'title':
    case 'table of contents':
      return [x + 12, y - 4];
    case 'callout':
    case 'code block':
      return [x + w, y + h / 2];
    default:
      return [x, y + h / 2];
  }
}

/**
 * Each part's name and API beside the page, with a leader to the part: left of the sidebar, above
 * the title and the TOC, right of the page's body. Labels on one side never overlap.
 */
export function placeLabels(rects: Record<string, Rect>): Placement[] {
  const out: Placement[] = [];
  for (const part of parts) {
    const side = SIDES[part.name];
    const dot = anchor(part.name, rects[part.name]);
    const label: [number, number] =
      side === 'top'
        ? [dot[0], -OUT + 8]
        : [side === 'left' ? -OUT : PAGE.width + OUT, dot[1] - LINE];
    out.push({ name: part.name, api: part.api, side, label, leader: '', dot });
  }

  // top down on each side, a label clears the one above it
  const order = [...out].sort((a, b) => a.dot[1] - b.dot[1]);
  const bottom: Record<Side, number> = { left: -Infinity, top: -Infinity, right: -Infinity };
  for (const item of order) {
    const { side, label, dot } = item;
    if (side === 'top') {
      item.leader = `M${dot[0]} ${label[1] + GAP}V${dot[1]}`;
      continue;
    }
    label[1] = Math.max(label[1], bottom[side] + 6);
    bottom[side] = label[1] + LABEL;
    const start = side === 'left' ? label[0] + GAP : label[0] - GAP;
    item.leader = `M${start} ${label[1] + LINE}L${dot[0]} ${dot[1]}`;
  }
  return out;
}
