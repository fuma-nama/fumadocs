import { Fragment, type ReactNode } from 'react';
import { cn } from '@/lib/cn';
import {
  art,
  choreograph,
  Clip,
  Cover,
  cycle,
  dashes,
  dither,
  draw,
  frame,
  Frames,
  Layer,
  Px,
  rect,
  roll,
  show,
  Stage,
  steps,
  Strip,
  Text,
  uncover,
  up,
} from './stage';

// sprites drawn by more than one mechanism, `#` cells

const MAGNIFIER = ['.###...', '#...#..', '#...#..', '#...#..', '.###...', '....##.', '.....##'];
const PLAY = ['#..', '##.', '###', '##.', '#..'];
const CHEVRON_DOWN = ['#...#', '.#.#.', '..#..'];
const WARNING = ['...#...', '..#.#..', '..#.#..', '.#.#.#.', '.#...#.', '#..#..#', '#######'];

// Search: the search dialog: `twoslash` is typed, results pop, the selection steps down, enter
const HASH = ['.#.#.', '#####', '.#.#.', '#####', '.#.#.'];
const QUERY = 'twoslash';
// what searching `twoslash` returns on fumadocs.dev: the page and its sections
const RESULTS = ['Twoslash', 'Usage', 'Cache'];

// the query box's frames: empty with the caret and without, a glyph more each with it, the whole
// query without it; a glyph a tick on 2-9, the caret blinking while it waits, cleared on 27
const typing: Record<number, number> = { 0: 0, 1: 1, 27: 0, 29: 1, 31: 0 };
for (let k = 0; k < QUERY.length; k++) typing[2 + k] = 2 + k;
for (let t = 12; t < 24; t += 2) typing[t] = t % 4 === 0 ? QUERY.length + 2 : QUERY.length + 1;

const search = choreograph('search', 32, {
  query: roll(7, typing, 9),
  list: roll(24, { 0: 0, 10: 1, 11: 2, 12: 3, 16: 4, 20: 5, 27: 0 }, 3),
  flash: { base: 'opacity:0', poses: show(26, 27) },
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
  for (let f = 0; f < QUERY.length + 3; f++) {
    queries.push(
      <Text key={f} x={0} y={0} h={7}>
        {QUERY.slice(0, Math.max(0, f - 1))}
        {f !== 1 && f !== QUERY.length + 2 && (
          <span className="ms-0.5 h-3 w-1.5 bg-(--bt-orange)" />
        )}
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
    <Stage c={search}>
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
      <Px ink={rect(0, 0, 96, 40)} className={c.flash} />
    </Stage>
  );
}

// OpenAPI: the playground: Send, a packet runs to the server and back with the status code
// operations of the Scalar Galaxy example spec and their success codes
const METHODS = ['GET', 'POST', 'GET', 'DELETE'];
const PATHS = ['/planets', '/planets', '/planets/{planetId}', '/planets/{planetId}'];
const CODES = ['200', '201', '200', '204'];

const openapi = choreograph('openapi', 32, {
  operation: cycle(7, 32, 4),
  press: { base: 'opacity:0', poses: show(2, 3) },
  // out to the server on 3-11, back on 15-23
  packet: {
    base: 'opacity:0',
    poses: {
      3: steps(8, 'opacity:1;transform:translateX(0)'),
      11: 'opacity:1;transform:translateX(144px)',
      12: 'opacity:0',
      15: steps(8, 'opacity:1;transform:translateX(135px)'),
      23: 'opacity:1;transform:translateX(0)',
      24: 'opacity:0',
    },
  },
  // the status on 23, a line of the body a tick on 24-26, cleared on 30
  response: uncover(17, { 0: 0, 23: 8, 24: 10, 25: 13, 26: 17, 30: 0 }),
});

function OpenAPIMechanism() {
  const c = openapi.cls;
  let server = frame(72, 8, 24, 24) + rect(75, 32, 4, 2) + rect(89, 32, 4, 2);
  for (let k = 0; k < 3; k++) {
    server += frame(74, 10 + 7 * k, 13, 5) + rect(76, 12 + 7 * k, 9, 1);
    server += rect(89, 11 + 7 * k, 2, 2) + rect(92, 11 + 7 * k, 2, 2);
  }
  const operations = [];
  for (let i = 0; i <= METHODS.length; i++) {
    const k = i % METHODS.length;
    operations.push(
      <Text key={i} x={0} y={0} w={96} h={7} className="font-mono">
        <span className="flex h-full w-13.5 items-center justify-center bg-lp-orange text-(--bt-paper)">
          {METHODS[k]}
        </span>
        <span className="ms-1.5">{PATHS[k]}</span>
      </Text>,
    );
  }

  return (
    <Stage c={openapi}>
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
      <Clip x={0} y={0} w={96} h={7}>
        <Frames h={7} className={c.operation}>
          {operations}
        </Frames>
      </Clip>
      <Layer x={0} y={10} w={22} h={9} className={c.press}>
        <Px w={22} h={9} ink={rect(0, 0, 22, 9)} knock={art(PLAY, 3, 2)} />
        <Text x={8} y={0} h={9} className="text-(--bt-paper)">
          Send
        </Text>
      </Layer>
      <Px x={24} y={13} w={3} h={3} ink={rect(0, 0, 3, 3)} className={c.packet} />
      <Clip x={0} y={22} w={12} h={7}>
        <Strip items={CODES} h={7} loop itemClassName="font-mono" className={c.operation} />
      </Clip>
      <Cover x={0} y={22} w={45} h={17} className={c.response} />
    </Stage>
  );
}

// AsyncAPI: a channel: messages ride the pipe on beats, the subscriber lights up as each arrives
const ENVELOPE = [
  '#########',
  '##.....##',
  '#.#...#.#',
  '#..#.#..#',
  '#...#...#',
  '#.......#',
  '#########',
];
const ARC_LEFT = ['..#', '.#.', '.#.', '..#'];
const ARC_RIGHT = ['#..', '.#.', '.#.', '#..'];

// messages of the `planetEvents` channel and the protocols of the example servers
const MESSAGES = ['PlanetCreated', 'SatelliteDiscovered', 'AtmosphereChanged', 'ImageUploaded'];
const PROTOCOLS = ['wss', 'kafka', 'mqtt'];

// a message arrives every 8 ticks, the protocol changes once per loop
const asyncapi = choreograph('asyncapi', 32, {
  belt: {
    ticks: 8,
    poses: { 0: steps(7, 'transform:translateX(0)'), 7: 'transform:translateX(63px)' },
  },
  arcs: { ticks: 8, poses: show(0, 2) },
  message: cycle(7, 8, 4),
  protocol: cycle(5, 32, 3),
});

function AsyncAPIMechanism() {
  const c = asyncapi.cls;
  let pipe = rect(0, 15, 84, 1) + rect(0, 27, 84, 1);
  for (let x = 6; x < 84; x += 12) pipe += rect(x, 13, 1, 2) + rect(x, 28, 1, 2);
  let belt = '';
  for (let k = 0; k < 5; k++) belt += art(ENVELOPE, 7 + 24 * k, 0);

  return (
    <Stage c={asyncapi}>
      <Px
        ink={
          frame(0, 1, 20, 7) +
          pipe +
          frame(84, 11, 12, 21) +
          rect(89, 4, 2, 7) +
          rect(87, 15, 6, 5) +
          rect(88, 24, 4, 1) +
          rect(88, 2, 4, 2)
        }
        knock={rect(84, 16, 1, 11)}
      />
      <Clip x={1} y={2} w={18} h={5}>
        <Strip
          items={PROTOCOLS}
          h={5}
          loop
          itemClassName="w-full text-center font-mono"
          className={c.protocol}
        />
      </Clip>
      <Clip x={23} y={1} w={58} h={7}>
        <Strip items={MESSAGES} h={7} loop itemClassName="font-mono" className={c.message} />
      </Clip>
      <Px x={84} y={1} w={12} h={4} ink={art(ARC_LEFT) + art(ARC_RIGHT, 9)} className={c.arcs} />
      <Clip x={0} y={16} w={84} h={11}>
        <Px x={-24} y={2} w={120} h={7} orange={belt} className={c.belt} />
      </Clip>
    </Stage>
  );
}

// GraphQL: the schema: a selection walks Query.customer to Customer.orders to Order.total
const EDGE = rect(0, 2, 6, 1) + art(PLAY, 3, 0);

// types of the store example schema, each with the field the selection walks through
const TYPES: [name: string, x: number, y: number, field: string, row: number][] = [
  ['Query', 0, 0, 'customer', 0],
  ['Customer', 34, 6, 'orders', 1],
  ['Order', 68, 18, 'total', 1],
];

const graphql = choreograph('graphql', 32, {
  hl0: { base: 'opacity:0', poses: show(0, 8) },
  hl1: { poses: show(8, 16) },
  hl2: { base: 'opacity:0', poses: show(16, 26) },
  edge1: draw(2, 3, 26),
  edge2: draw(10, 3, 26),
  // the type header lights as its edge arrives
  flash1: { base: 'opacity:0', poses: show(5, 6) },
  flash2: { base: 'opacity:0', poses: show(13, 14) },
});

function GraphQLMechanism() {
  const c = graphql.cls;
  const hlCls = [c.hl0, c.hl1, c.hl2];
  const flashCls = [undefined, c.flash1, c.flash2];
  let ink = '';
  const labels = [];
  const lit = [];
  for (let i = 0; i < TYPES.length; i++) {
    const [name, x, y, field, row] = TYPES[i];
    ink += frame(x, y, 28, 18) + rect(x, y, 28, 6) + rect(x + 2, y + 8 + 6 * (1 - row), 14, 1);
    labels.push(
      <Text key={name} x={x + 2} y={y} h={6} className="font-mono text-(--bt-paper)">
        {name}
      </Text>,
      <Text key={field} x={x + 2} y={y + 6 + 6 * row} h={6} className="font-mono">
        {field}
      </Text>,
    );
    lit.push(
      <Layer
        key={`hl-${field}`}
        x={x + 1}
        y={y + 6 + 6 * row}
        w={26}
        h={6}
        className={`bt-on-hi ${hlCls[i]}`}
      >
        <Px w={26} h={6} hi={rect(0, 0, 26, 6)} />
        <Text x={1} y={0} h={6} className="font-mono">
          {field}
        </Text>
      </Layer>,
    );
    if (flashCls[i]) {
      lit.push(
        <Layer key={`flash-${name}`} x={x + 1} y={y} w={26} h={6} className={flashCls[i]}>
          <Px w={26} h={6} paper={rect(0, 1, 26, 4)} />
          <Text x={1} y={0} h={6} className="font-mono">
            {name}
          </Text>
        </Layer>,
      );
    }
  }

  return (
    <Stage c={graphql}>
      <Px ink={ink} />
      {labels}
      {lit}
      <Px x={28} y={6} w={6} h={5} ink={EDGE} className={c.edge1} />
      <Px x={62} y={18} w={6} h={5} ink={EDGE} className={c.edge2} />
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

// the tool's frames: none, the spinner turning a frame a tick while it searches (4-9), its result
const tool: Record<number, number> = { 0: 0, 10: 7, 29: 0 };
for (let t = 4; t < 10; t++) tool[t] = t - 3;

const chat = choreograph('chat', 32, {
  ask: { poses: show(2, 29) },
  tool: roll(8, tool, 7),
  // the answer streams in a block at a time on 12-17, cleared on 29
  answer: uncover(15, { 0: 0, 12: 1, 13: 3, 15: 12, 17: 15, 29: 0 }),
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
    <Stage c={chat}>
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
      <Cover x={0} y={22} w={76} h={15} className={c.answer} />
    </Stage>
  );
}

// llms.txt: a page is read block by block and printed as the Markdown served to AI agents
const llms = choreograph('llms', 32, {
  beam: {
    base: 'opacity:0',
    poses: {
      1: 'opacity:1;transform:translateY(0)',
      4: 'transform:translateY(12px)',
      7: 'transform:translateY(24px)',
      10: 'transform:translateY(36px)',
      13: 'transform:translateY(54px)',
      17: 'opacity:0',
    },
  },
  // a block printed as the beam passes it on 2-16, cleared on 28
  print: uncover(33, { 0: 0, 2: 6, 5: 9, 8: 14, 11: 19, 14: 24, 15: 27, 16: 33, 28: 0 }),
});

function LLMsMechanism() {
  const c = llms.cls;
  return (
    <Stage c={llms}>
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
// one halfway; flipping on 0, 16 and 32, from the last value to the next, it lands on the 3rd tick
const flips: Record<number, number> = {};
for (let i = 0; i < 3; i++) {
  const last = 3 * ((i + 2) % 3);
  flips[16 * i] = last;
  flips[16 * i + 1] = last + 1;
  flips[16 * i + 2] = last + 2;
  flips[16 * i + 3] = 3 * i;
}

const i18n = choreograph('i18n', 48, { flap: roll(17, flips, 0) });

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
  return (
    <Stage c={i18n}>
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
const gear: Record<number, number> = { 0: 0, 18: 0 };
for (let t = 2; t < 18; t++) gear[t] = t % 2 === 0 ? 1 : 2;

// prints 32 rows in 16 steps (ticks 2-18), the card holds, the head parks back on 25-27
const og = choreograph('og', 32, {
  cover: {
    base: 'transform-origin:50% 100%;transform:scaleY(0)',
    poses: {
      0: 'transform:scaleY(1)',
      2: steps(16, 'transform:scaleY(1)'),
      18: 'transform:scaleY(0)',
      27: 'transform:scaleY(1)',
    },
  },
  head: {
    base: 'transform:translateY(96px)',
    poses: {
      0: 'transform:translateY(0)',
      2: steps(16, 'transform:translateY(0)'),
      18: 'transform:translateY(96px)',
      25: steps(2, 'transform:translateY(96px)'),
      27: 'transform:translateY(0)',
    },
  },
  gear: roll(3, gear, 0),
  flash: { base: 'opacity:0', poses: show(18, 19) },
});

function OGMechanism() {
  const c = og.cls;
  return (
    <Stage c={og}>
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

// Twoslash: a code block like the docs example: hovering `player` pops its type from the compiler
const POINTER = [
  '#......',
  '##.....',
  '#o#....',
  '#oo#...',
  '#ooo#..',
  '#oooo#.',
  '#ooooo#',
  '#oo####',
  '#o#....',
  '##.....',
];

// the pointer comes from its rest at the corner in four steps and leaves the same way
const REST = 'transform:translate(153px,36px)';
const ON_WORD = 'transform:translate(0,0)';

const twoslash = choreograph('twoslash', 32, {
  pointer: { poses: { 0: REST, 1: steps(4, REST), 5: ON_WORD, 24: steps(4, ON_WORD), 28: REST } },
  popup: { poses: show(6, 24) },
});

function TwoslashMechanism() {
  const c = twoslash.cls;
  return (
    <Stage c={twoslash}>
      <Px
        ink={
          frame(0, 0, 96, 40) +
          rect(15, 6, 14, 1) +
          rect(31, 6, 10, 1) +
          rect(5, 27, 12, 1) +
          rect(19, 27, 22, 1) +
          rect(5, 32, 8, 1)
        }
        orange={rect(5, 6, 8, 1)}
      />
      <Text x={5} y={15} h={3} className="bt-code">
        <span className="text-(--bt-orange)">const</span>
        {" player: Player = { name: 'Hello' };"}
      </Text>
      <Layer x={15} y={3} className={c.popup}>
        {/* the popup's frame is a cell thick and as wide as its type */}
        <Text
          x={0}
          y={0}
          h={9}
          className="bt-code border-3 border-(--bt-ink) bg-(--bt-paper) px-0.75"
        >
          <span className="text-(--bt-orange)">const</span> player: Player
        </Text>
        <Px x={5} y={9} w={1} h={1} ink={rect(0, 0, 1, 1)} />
      </Layer>
      <Px
        x={21}
        y={17}
        w={7}
        h={10}
        ink={art(POINTER)}
        paper={art(POINTER, 0, 0, 'o')}
        className={c.pointer}
      />
    </Stage>
  );
}

// Type Table: rows are generated one by one, then `options?` opens to its type and default
const CHEVRON_UP = ['..#..', '.#.#.', '#...#'];
// the props of the auto-type-table docs example
const PROPS = ['name', 'fn', 'options?'];

const table = choreograph('table', 32, {
  // a row a tick on 1-3, cleared on 29
  rows: uncover(18, { 0: 0, 1: 6, 2: 12, 3: 18, 29: 0 }),
  open: { poses: show(7, 24) },
  // its type on 8, its default on 9, folded on 24
  detail: uncover(10, { 0: 0, 8: 5, 9: 10, 24: 0 }),
});

function TypeTableMechanism() {
  const c = table.cls;
  let ink = frame(0, 0, 96, 40) + dashes(1, 8, 94, 1, 1);
  const rows = [];
  for (let i = 0; i < PROPS.length; i++) {
    ink += dashes(1, 14 + 6 * i, 94, 1, 1) + art(CHEVRON_DOWN, 88, 10 + 6 * i);
    rows.push(
      <Text key={PROPS[i]} x={3} y={9 + 6 * i} h={5} className="bt-code">
        {PROPS[i]}
      </Text>,
    );
  }

  return (
    <Stage c={table}>
      <Px ink={ink} />
      <Text x={3} y={1} h={7} className="opacity-55">
        Prop
      </Text>
      {rows}
      <Text x={4} y={28} h={5} className="opacity-55">
        Type
      </Text>
      <Text x={24} y={28} h={5} className="bt-code">
        {'Partial<{ a: unknown }>'}
      </Text>
      <Text x={4} y={33} h={5} className="opacity-55">
        Default
      </Text>
      <Text x={24} y={33} h={5} className="bt-code">
        {'{ a: "test" }'}
      </Text>
      <Layer x={1} y={20} w={94} h={6} className={`bt-on-hi ${c.open}`}>
        <Px w={94} h={6} hi={rect(0, 0, 94, 6)} ink={art(CHEVRON_UP, 87, 2)} />
        <Text x={2} y={1} h={5} className="bt-code">
          options?
        </Text>
      </Layer>
      <Cover x={1} y={9} w={94} h={18} className={c.rows} />
      <Cover x={1} y={28} w={94} h={10} className={c.detail} />
    </Stage>
  );
}

// Story: the docs story of `Callout`: the Variant select flips the preview from Default to Warning
const INFO = ['.#####.', '#.....#', '#..#..#', '#.....#', '#..#..#', '#..#..#', '.#####.'];
// the variants of the `Callout` story in the docs
const VARIANTS = ['Default', 'Warning'];

// the select opens on 5, picks Warning on 7 and closes on 10; back to Default on 24
const story = choreograph('story', 32, {
  menu: roll(16, { 0: 0, 5: 1, 7: 2, 10: 0 }, 0),
  value: { base: up(7), poses: { 0: up(0), 9: up(3.5), 10: up(7), 23: up(3.5), 24: up(0) } },
  icon: roll(13, { 0: 0, 10: 1, 24: 0 }, 1),
});

/** the select's open menu, `pick` on the selection's yellow */
function Menu({ pick }: { pick: number }) {
  const options = [];
  for (let i = 0; i < VARIANTS.length; i++) {
    options.push(
      <Layer key={i} className={i === pick ? 'bt-on-hi' : undefined}>
        {i === pick && <Px w={33} h={16} hi={rect(1, 1 + 7 * i, 31, 7)} />}
        <Text x={3} y={1 + 7 * i} h={7}>
          {VARIANTS[i]}
        </Text>
      </Layer>,
    );
  }
  return (
    <>
      <Px w={33} h={16} paper={rect(0, 0, 33, 16)} ink={frame(0, 0, 33, 16)} />
      {options}
    </>
  );
}

function StoryMechanism() {
  const c = story.cls;
  return (
    <Stage c={story}>
      <Text x={0} y={0} h={7}>
        Callout
      </Text>
      <Text x={44} y={0} h={7} className="opacity-55">
        Variant
      </Text>
      <Px
        ink={
          art(CHEVRON_DOWN, 90, 2) +
          frame(0, 8, 96, 21) +
          dither(1, 9, 94, 19, 1) +
          frame(6, 12, 84, 13) +
          rect(19, 15, 28, 2) +
          rect(19, 19, 52, 1) +
          rect(19, 21, 38, 1) +
          frame(0, 32, 96, 8) +
          rect(24, 33, 1, 6) +
          rect(26, 35, 40, 1)
        }
        paper={rect(7, 13, 82, 11)}
      />
      <Text x={2} y={33} h={6} className="opacity-55">
        title
      </Text>
      <Clip x={65} y={0} w={22} h={7}>
        <Strip items={VARIANTS} h={7} className={c.value} />
      </Clip>
      <Clip x={6} y={12} w={10} h={13}>
        <Frames h={13} className={c.icon}>
          {[
            <Px key="info" w={10} h={13} ink={art(INFO, 3, 3)} />,
            <Px key="warning" w={10} h={13} orange={art(WARNING, 3, 3) + rect(0, 0, 2, 13)} />,
          ]}
        </Frames>
      </Clip>
      <Clip x={63} y={7} w={33} h={16}>
        <Frames h={16} className={c.menu}>
          {[null, <Menu key={0} pick={0} />, <Menu key={1} pick={1} />]}
        </Frames>
      </Clip>
    </Stage>
  );
}

// Obsidian: a vault note: its wikilink, callout and embed render one by one into the docs page
const FOLD = ['#####', '.#..#', '..#.#', '...##', '....#'];
// `Xmas.png` of the example vault: a tree under the moon, tiers shaded by the dither
const TREE = [
  '.......o.......',
  '......###......',
  '.....#####.....',
  '....#######....',
  '.....:::::.....',
  '....:::::::....',
  '...:::::::::...',
  '....,,,,,,,....',
  '...,,,,,,,,,...',
  '..,,,,,,,,,,,..',
];
// syntax lines of `Welcome.md` in the example vault
const LINES = ['[[create a link]]', '> [!warning]', '![[Xmas.png]]'];

const obsidian = choreograph('obsidian', 32, {
  // a line lit while its link is drawn
  line: roll(23, { 0: 0, 2: 1, 6: 0, 10: 2, 14: 0, 18: 3, 22: 0 }, 0),
  link0: draw(2, 4, 28),
  link1: draw(10, 4, 28),
  link2: draw(18, 4, 28),
  // the page renders each line as its link lands, cleared on 28
  page: uncover(33, { 0: 0, 6: 10, 14: 19, 22: 33, 28: 0 }),
});

function ObsidianMechanism() {
  const c = obsidian.cls;
  const linkCls = [c.link0, c.link1, c.link2];
  const lines = [];
  const lit: ReactNode[] = [null];
  for (let i = 0; i < LINES.length; i++) {
    lines.push(
      // the line, and its link drawn on to the page's column
      <Text key={i} x={2} y={10 + 9 * i} w={54} h={5} className="bt-code">
        <span className="px-0.75">{LINES[i]}</span>
        <span className={`bt-dashes flex-1 ${linkCls[i]}`} />
      </Text>,
    );
    lit.push(
      <Text key={i} x={0} y={9 * i} h={5} className="bt-code bt-on-hi">
        <span className="flex items-center self-stretch bg-lp-yellow px-0.75">{LINES[i]}</span>
      </Text>,
    );
  }

  return (
    <Stage c={obsidian}>
      <Px
        ink={
          rect(0, 0, 44, 1) +
          rect(0, 1, 1, 39) +
          rect(47, 5, 1, 35) +
          rect(1, 39, 47, 1) +
          art(FOLD, 43, 0) +
          rect(3, 7, 30, 1) +
          rect(3, 25, 24, 1) +
          rect(3, 35, 20, 1)
        }
      />
      <Text x={3} y={1} h={6}>
        Welcome
      </Text>
      <Px ink={frame(56, 7, 40, 10)} paper={rect(57, 8, 38, 8)} />
      <Text x={58} y={8} h={8} className="text-lp-orange underline underline-offset-2">
        create a link
      </Text>
      <Px
        ink={frame(56, 18, 40, 8) + rect(64, 21, 22, 2) + rect(56, 18, 2, 8) + art(WARNING, 59, 19)}
      />
      <Px
        ink={rect(56, 27, 40, 13)}
        knock={art(TREE, 68, 28) + dither(71, 32, 9, 3, 12) + dither(70, 35, 11, 3, 8)}
        orange={art(TREE, 68, 28, 'o')}
        className="bt-ink-card"
      />
      {lines}
      <Clip x={2} y={10} w={54} h={23}>
        <Frames h={23} className={c.line}>
          {lit}
        </Frames>
      </Clip>
      <Cover x={56} y={7} w={40} h={33} className={c.page} />
    </Stage>
  );
}

/** the mechanism of each module, by its title */
export const mechanisms: Record<string, ReactNode> = {
  Search: <SearchMechanism />,
  OpenAPI: <OpenAPIMechanism />,
  AsyncAPI: <AsyncAPIMechanism />,
  GraphQL: <GraphQLMechanism />,
  'AI Chat': <AIChatMechanism />,
  'llms.txt': <LLMsMechanism />,
  i18n: <I18nMechanism />,
  'OG Image': <OGMechanism />,
  Twoslash: <TwoslashMechanism />,
  'Type Table': <TypeTableMechanism />,
  Story: <StoryMechanism />,
  Obsidian: <ObsidianMechanism />,
};
