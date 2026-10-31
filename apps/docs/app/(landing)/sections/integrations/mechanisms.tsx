import { Fragment, type ReactNode } from 'react';
import { cn } from '@/lib/cn';
import {
  art,
  choreograph,
  Clip,
  Cover,
  dashes,
  dither,
  frame,
  Frames,
  glide,
  Layer,
  Px,
  rect,
  roll,
  show,
  Stage,
  Strip,
  Text,
  uncover,
} from './stage';

// sprites drawn by more than one mechanism, `#` cells

const MAGNIFIER = ['.###...', '#...#..', '#...#..', '#...#..', '.###...', '....##.', '.....##'];
const PLAY = ['#..', '##.', '###', '##.', '#..'];

// Search: the search dialog: `twoslash` is typed, results pop, the selection steps down
const HASH = ['.#.#.', '#####', '.#.#.', '#####', '.#.#.'];
const QUERY = 'twoslash';
// what searching `twoslash` returns on fumadocs.dev: the page and its sections
const RESULTS = ['Twoslash', 'Usage', 'Cache'];

// the query box's frames, a glyph more each, the caret after them: a glyph a tick on 1-8
const typing: Record<number, number> = {};
for (let k = 0; k <= QUERY.length; k++) typing[k] = k;

const SEARCH_STATES = ['ready', 'typing', '3 results'];

const search = choreograph('search', 17, 16, {
  status: roll(5, { 0: 0, 1: 1, 9: 2 }, 2),
  lamp: { base: 'visibility:hidden', poses: show(1) },
  query: roll(7, typing, QUERY.length),
  list: roll(24, { 0: 0, 9: 1, 10: 2, 11: 3, 13: 4, 15: 5 }, 5),
});

/** row `i` of the list, on the selection's yellow when it's selected */
function Result({ i, selected }: { i: number; selected: boolean }) {
  const y = 8 * i;
  return (
    <Layer className={selected ? 'bt-on-hi' : undefined}>
      {selected && <Px w={94} h={24} hi={rect(0, y, 94, 8)} />}
      {i > 0 && <Px w={94} h={24} ink={rect(4, y, 1, 8) + art(HASH, 7, y + 2)} />}
      <Text x={i === 0 ? 3 : 14} y={y} h={8}>
        {RESULTS[i]}
      </Text>
    </Layer>
  );
}

function SearchMechanism() {
  const c = search.cls;
  const queries = [];
  for (let f = 0; f <= QUERY.length; f++) {
    queries.push(
      <Text key={f} x={0} y={0} h={7}>
        {QUERY.slice(0, f)}
        <span className="ms-0.5 h-3 w-1.5 bg-(--bt-orange)" />
      </Text>,
    );
  }
  // the list's frames: a row more each, then the selection a row down each
  const lists = [];
  for (let f = 0; f < 6; f++) {
    const results = [];
    for (let i = 0; i < Math.min(f, 3); i++)
      results.push(<Result key={i} i={i} selected={i === Math.max(f - 3, 0)} />);
    lists.push(<Fragment key={f}>{results}</Fragment>);
  }

  return (
    <Stage c={search} states={SEARCH_STATES} status={c.status} lamp={c.lamp} spec="zbsearch">
      <Px
        ink={frame(0, 0, 96, 40) + rect(0, 10, 96, 1) + art(MAGNIFIER, 3, 2) + frame(80, 2, 14, 7)}
      />
      <Text x={80} y={2} w={14} h={7} className="justify-center">
        ESC
      </Text>
      <Clip x={12} y={2} w={66} h={7}>
        <Frames h={7} className={c.query}>
          {queries}
        </Frames>
      </Clip>
      <Clip x={1} y={12} w={94} h={24}>
        <Frames h={24} className={c.list}>
          {lists}
        </Frames>
      </Clip>
    </Stage>
  );
}

// OpenAPI: the playground: Send, a packet runs to the server and back with the status code, for an
// operation of the Scalar Galaxy example spec

const OPENAPI_STATES = ['ready', 'sending', 'responded'];

const openapi = choreograph('openapi', 20, 19, {
  status: roll(5, { 0: 0, 1: 1, 15: 2 }, 2),
  lamp: { base: 'visibility:hidden', poses: show(2, 16) },
  press: { base: 'visibility:hidden', poses: show(1, 2) },
  // out to the server on 2-7, back on 10-15
  packet: {
    base: 'opacity:0',
    poses: {
      2: glide('opacity:1;transform:translateX(0)'),
      7: 'opacity:1;transform:translateX(144px)',
      8: 'opacity:0',
      10: glide('opacity:1;transform:translateX(135px)'),
      15: 'opacity:1;transform:translateX(0)',
      16: 'opacity:0',
    },
  },
  // the status on 15, a line of the body a tick on 16-18
  response: uncover(17, { 0: 0, 15: 8, 16: 10, 17: 13, 18: 17 }),
});

function OpenAPIMechanism() {
  const c = openapi.cls;
  let server = frame(72, 8, 24, 24) + rect(75, 32, 4, 2) + rect(89, 32, 4, 2);
  for (let k = 0; k < 3; k++) {
    server += frame(74, 10 + 7 * k, 13, 5) + rect(76, 12 + 7 * k, 9, 1);
    server += rect(89, 11 + 7 * k, 2, 2) + rect(92, 11 + 7 * k, 2, 2);
  }
  return (
    <Stage c={openapi} states={OPENAPI_STATES} status={c.status} lamp={c.lamp} spec="openapi 3.1">
      <Px
        ink={
          frame(0, 10, 22, 9) +
          art(PLAY, 3, 12) +
          dashes(23, 14, 49, 1, 2) +
          server +
          rect(0, 31, 30, 1) +
          rect(3, 34, 42, 1) +
          rect(3, 37, 26, 1)
        }
      />
      <Text x={8} y={10} h={9}>
        Send
      </Text>
      <Text x={0} y={0} w={96} h={7} className="font-mono">
        <span className="flex h-full w-13.5 items-center justify-center bg-lp-orange text-(--bt-paper)">
          GET
        </span>
        <span className="ms-1.5">/planets</span>
      </Text>
      <Layer x={0} y={10} w={22} h={9} className={c.press}>
        <Px w={22} h={9} ink={rect(0, 0, 22, 9)} knock={art(PLAY, 3, 2)} />
        <Text x={8} y={0} h={9} className="text-(--bt-paper)">
          Send
        </Text>
      </Layer>
      <Px x={24} y={13} w={3} h={3} ink={rect(0, 0, 3, 3)} className={c.packet} />
      <Clip x={0} y={22} w={12} h={7}>
        <Strip items={['200']} h={7} itemClassName="font-mono" />
      </Clip>
      {/* a cell past the lines it hides, so no edge of them shows at a fractional zoom */}
      <Cover x={0} y={22} w={46} h={17} className={c.response} />
    </Stage>
  );
}

// AI Chat: Ask AI: a question, the docs search tool runs, the answer streams in block by block
// x, y of the twelve cells around a 5x5 ring, clockwise from the top
const RING = [1, 0, 2, 0, 3, 0, 4, 1, 4, 2, 4, 3, 3, 4, 2, 4, 1, 4, 0, 3, 0, 2, 0, 1];

/** frame `f` of the spinner, a four-cell arc stepping two cells a frame */
function spinner(f: number): string {
  let d = '';
  for (let j = 0; j < 4; j++) {
    const k = 2 * ((2 * f + j) % 12);
    d += rect(RING[k], RING[k + 1], 1, 1);
  }
  return d;
}

// the tool's frames: none, the spinner turning a frame a tick while it searches (3-8), its result
const tool: Record<number, number> = { 0: 0, 9: 7 };
for (let t = 3; t < 9; t++) tool[t] = t - 2;

const CHAT_STATES = ['ready', 'searching', 'answering', 'answered'];

const chat = choreograph('chat', 18, 17, {
  status: roll(5, { 0: 0, 3: 1, 11: 2, 16: 3 }, 3),
  lamp: { base: 'visibility:hidden', poses: show(1) },
  ask: { poses: show(1) },
  tool: roll(8, tool, 7),
  // the answer streams in a block at a time on 11-16
  answer: uncover(15, { 0: 0, 11: 1, 12: 3, 14: 12, 16: 15 }),
});

function AIChatMechanism() {
  const c = chat.cls;
  const frames: ReactNode[] = [null];
  for (let f = 0; f < 6; f++) {
    frames.push(
      <Fragment key={f}>
        <Px y={2} w={5} h={5} ink={spinner(f)} />
        <Text x={9} y={0} h={7}>
          Searching
        </Text>
      </Fragment>,
    );
  }
  frames.push(
    <Fragment key="searched">
      <Px w={7} h={8} ink={art(MAGNIFIER, 0, 1)} />
      <Text x={9} y={0} h={7}>
        Searched
      </Text>
      <Text x={39} y={0} h={7} className="opacity-55">
        3 results
      </Text>
    </Fragment>,
  );

  return (
    <Stage c={chat} states={CHAT_STATES} status={c.status} lamp={c.lamp} spec="search tool">
      <Px
        ink={rect(0, 22, 76, 1) + rect(0, 24, 58, 1) + rect(0, 27, 64, 7) + rect(0, 36, 42, 1)}
        knock={rect(3, 29, 24, 1) + rect(3, 31, 36, 1)}
      />
      <Px
        x={46}
        w={50}
        h={9}
        ink={frame(0, 0, 50, 9) + rect(4, 3, 34, 1) + rect(4, 5, 20, 1)}
        paper={rect(1, 1, 48, 7)}
        className={c.ask}
      />
      <Clip x={0} y={11} w={96} h={8}>
        <Frames h={8} className={c.tool}>
          {frames}
        </Frames>
      </Clip>
      {/* a cell past the lines it hides, so no edge of them shows at a fractional zoom */}
      <Cover x={0} y={22} w={77} h={15} className={c.answer} />
    </Stage>
  );
}

// llms.txt: a page is read block by block and printed as the Markdown served to AI agents
const LLMS_STATES = ['ready', 'reading', 'served'];

const llms = choreograph('llms', 15, 14, {
  status: roll(5, { 0: 0, 1: 1, 13: 2 }, 2),
  lamp: { base: 'visibility:hidden', poses: show(1, 13) },
  beam: {
    base: 'opacity:0',
    poses: {
      1: glide('opacity:1;transform:translateY(0)'),
      3: glide('opacity:1;transform:translateY(12px)'),
      5: glide('opacity:1;transform:translateY(24px)'),
      7: glide('opacity:1;transform:translateY(36px)'),
      9: 'opacity:1;transform:translateY(54px)',
      13: 'opacity:0',
    },
  },
  // a block printed as the beam passes it on 2-12
  print: uncover(33, { 0: 0, 2: 6, 4: 9, 6: 14, 8: 19, 10: 24, 11: 27, 12: 33 }),
});

function LLMsMechanism() {
  const c = llms.cls;
  return (
    <Stage c={llms} states={LLMS_STATES} status={c.status} lamp={c.lamp} spec="text/markdown">
      <Px
        ink={
          frame(0, 4, 26, 35) +
          rect(3, 7, 14, 2) +
          dither(3, 11, 20, 1, 10) +
          rect(3, 15, 10, 2) +
          rect(3, 19, 20, 1) +
          rect(3, 21, 15, 1) +
          rect(3, 25, 20, 9) +
          frame(34, 4, 62, 35) +
          art(PLAY, 28, 19) +
          rect(41, 8, 22, 1) +
          rect(37, 12, 40, 1) +
          rect(43, 16, 12, 1) +
          rect(37, 20, 50, 1) +
          rect(37, 22, 36, 1) +
          rect(39, 30, 30, 1)
        }
        knock={rect(5, 27, 10, 1) + rect(5, 29, 14, 1) + rect(5, 31, 8, 1)}
      />
      <Text x={34} y={0} h={4} className="bt-code opacity-55">
        /docs/markdown/twoslash.md
      </Text>
      <Text x={37} y={7} h={3} className="bt-code">
        #
      </Text>
      <Text x={37} y={15} h={3} className="bt-code">
        ##
      </Text>
      <Text x={37} y={25} h={3} className="bt-code">
        ```ts
      </Text>
      <Text x={37} y={33} h={3} className="bt-code">
        ```
      </Text>
      <Cover x={35} y={5} w={60} h={33} className={c.print} />
      <Px x={1} y={7} w={24} h={1} orange={rect(0, 0, 24, 1)} className={c.beam} />
    </Stage>
  );
}

// i18n: a split-flap display: the locale and the translated `On this page` flip together
// `On this page` of the table of contents in @fumadocs/language
const LOCALES = ['en', 'zh-cn', 'zh-tw'];
const LABELS = ['On this page', '本页目录', '本頁目錄'];

// a face is 17 cells, two 25px halves around a 1px cut
const HALF = 25 / 3;
const LOW = 26 / 3;

// frames of a unit: each value, then the top flap halfway down to the next value, then the bottom
// one halfway; from the last value, flipping on 1, 5 and 9 to the next, landing two ticks on
const flips: Record<number, number> = { 0: 6 };
for (let i = 0; i < 3; i++) {
  const last = 3 * ((i + 2) % 3);
  flips[4 * i + 1] = last + 1;
  flips[4 * i + 2] = last + 2;
  flips[4 * i + 3] = 3 * i;
}

const I18N_STATES = ['flipping', ...LOCALES];

const i18n = choreograph('i18n', 13, 12, {
  status: roll(5, { 0: 3, 1: 0, 3: 1, 5: 0, 7: 2, 9: 0, 11: 3 }, 3),
  lamp: { base: 'visibility:hidden', poses: show(1, 3, 5, 7, 9, 11) },
  flap: roll(17, flips, 6),
});

interface FlapProps {
  x: number;
  y: number;
  w: number;
  values: readonly string[];
  /** the values are codes, like a locale's */
  code?: boolean;
}

/** a split-flap unit, 17 cells tall, its hinge notched into the cells either side of the faces */
function Flap({ x, y, w, values, code }: FlapProps) {
  const half = (value: string, low: boolean, fold?: string) => (
    <Clip x={0} y={low ? LOW : 0} w={w - 2} h={HALF} className={fold}>
      <span
        className={cn(
          'flex h-12.75 w-full items-center justify-center bg-(--bt-ink) text-2xl font-medium text-(--bt-paper)',
          low && '-top-6.5',
          code && 'font-mono',
        )}
      >
        {value}
      </span>
    </Clip>
  );
  const faces = [];
  for (let i = 0; i < values.length; i++) {
    const next = values[(i + 1) % values.length];
    faces.push(
      <Fragment key={i}>
        {half(values[i], false)}
        {half(values[i], true)}
      </Fragment>,
      <Fragment key={`${i}-top`}>
        {half(next, false)}
        {half(values[i], false, 'origin-bottom scale-y-50')}
        {half(values[i], true)}
      </Fragment>,
      <Fragment key={`${i}-bottom`}>
        {half(next, false)}
        {half(values[i], true)}
        {half(next, true, 'origin-top scale-y-50')}
      </Fragment>,
    );
  }
  return (
    <>
      <Px
        x={x}
        y={y}
        w={w}
        h={17}
        ink={rect(0, 0, w, 17)}
        knock={rect(0, 8, 1, 1) + rect(w - 1, 8, 1, 1)}
      />
      <Clip x={x + 1} y={y} w={w - 2} h={17}>
        <Frames h={17} className={i18n.cls.flap}>
          {faces}
        </Frames>
      </Clip>
    </>
  );
}

function I18nMechanism() {
  const c = i18n.cls;
  return (
    <Stage c={i18n} states={I18N_STATES} status={c.status} lamp={c.lamp} spec="3 locales">
      <Flap x={0} y={3} w={32} values={LOCALES} code />
      <Layer className="bt-lag">
        <Flap x={0} y={22} w={96} values={LABELS} />
      </Layer>
    </Stage>
  );
}

// OG Image: a print head prints the default `generateOGImage` card, 1200x630, line by line
const LOGO = ['.###.', '#...#', '#...#', '#...#', '.###.'];
const GEAR = ['.#.', '###', '.#.'];
const GEAR_TURNED = ['#.#', '.#.', '#.#'];

// the gear's frames: at rest, then turning a tick at a time with its lamp lit while printing (2-17)
const gear: Record<number, number> = { 0: 0, 11: 0 };
for (let t = 1; t < 11; t++) gear[t] = t % 2 === 0 ? 2 : 1;

// prints its 32 rows over ticks 1-11, and the card holds
const OG_STATES = ['ready', 'printing', 'printed'];

const og = choreograph('og', 13, 12, {
  status: roll(5, { 0: 0, 1: 1, 11: 2 }, 2),
  lamp: { base: 'visibility:hidden', poses: show(1, 11) },
  cover: {
    base: 'transform-origin:50% 100%;transform:scaleY(0)',
    poses: {
      0: 'transform:scaleY(1)',
      1: glide('transform:scaleY(1)'),
      11: 'transform:scaleY(0)',
    },
  },
  head: {
    base: 'transform:translateY(96px)',
    poses: {
      0: 'transform:translateY(0)',
      1: glide('transform:translateY(0)'),
      11: 'transform:translateY(96px)',
    },
  },
  gear: roll(3, gear, 0),
  flash: { base: 'visibility:hidden', poses: show(11, 12) },
});

function OGMechanism() {
  const c = og.cls;
  return (
    <Stage c={og} states={OG_STATES} status={c.status} lamp={c.lamp} spec="png">
      <Px
        ink={
          rect(0, 0, 1, 3) +
          rect(63, 0, 1, 3) +
          rect(0, 1, 22, 1) +
          rect(42, 1, 22, 1) +
          frame(0, 5, 64, 34) +
          rect(72, 5, 1, 35) +
          rect(74, 5, 1, 35) +
          frame(69, 0, 9, 6)
        }
      />
      <Text x={22} y={0} w={20} h={3} className="bt-code justify-center">
        1200×630
      </Text>
      <Layer className="bt-ink-card">
        <Px
          ink={rect(1, 6, 62, 32)}
          knock={dither(5, 14, 44, 2, 12) + dither(5, 18, 30, 2, 12)}
          orange={dashes(5, 22, 54, 3, 2) + art(LOGO, 5, 28) + rect(1, 36, 62, 2)}
        />
        <Text x={5} y={8} h={4} className="text-(--bt-paper)">
          Twoslash
        </Text>
        <Text x={12} y={28} h={5} className="text-(--bt-orange)">
          Fumadocs
        </Text>
      </Layer>
      <Px x={1} y={6} w={62} h={32} paper={rect(0, 0, 62, 32)} className={c.cover} />
      <Px x={1} y={6} w={62} h={32} ink={rect(0, 0, 62, 32)} className={c.flash} />
      <Px
        y={4}
        w={76}
        h={3}
        ink={rect(0, 1, 70, 1) + rect(26, 0, 12, 3) + rect(70, 0, 6, 3)}
        knock={rect(30, 1, 4, 1)}
        className={c.head}
      />
      <Clip x={72} y={2} w={5} h={3}>
        <Frames h={3} className={c.gear}>
          {[
            <Px key="rest" w={5} h={3} ink={art(GEAR)} />,
            <Px key="lit" w={5} h={3} ink={art(GEAR) + rect(4, 0, 1, 1)} />,
            <Px key="turned" w={5} h={3} ink={art(GEAR_TURNED) + rect(4, 0, 1, 1)} />,
          ]}
        </Frames>
      </Clip>
    </Stage>
  );
}

/** the mechanism of each module, by its title */
export const mechanisms: Record<string, ReactNode> = {
  Search: <SearchMechanism />,
  OpenAPI: <OpenAPIMechanism />,
  'AI Chat': <AIChatMechanism />,
  'llms.txt': <LLMsMechanism />,
  i18n: <I18nMechanism />,
  'OG Image': <OGMechanism />,
};
