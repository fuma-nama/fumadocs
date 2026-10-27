import type { ReactNode } from 'react';
import {
  art,
  choreograph,
  Clip,
  cycle,
  dashes,
  dither,
  draw,
  frame,
  Layer,
  pop,
  type Poses,
  Px,
  rect,
  show,
  Stage,
  steps,
  Strip,
  Text,
  type Track,
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

const searchTracks: Record<string, Track> = {
  caret: { poses: show(0, 1, 2, 12, 14, 16, 18, 20, 22, 29, 31) },
  row0: { poses: pop(10, 27) },
  row1: { poses: pop(11, 27) },
  row2: { poses: pop(12, 27) },
  sel0: { poses: show(10, 16) },
  sel1: { base: 'opacity:0', poses: show(16, 20) },
  sel2: { base: 'opacity:0', poses: show(20, 26) },
  flash: { base: 'opacity:0', poses: show(26, 27) },
};
// the query is typed one glyph per tick (2-10) and cleared on 27, the caret following the glyphs
for (let k = 0; k < QUERY.length; k++) {
  searchTracks[`key${k}`] = {
    poses: { 0: 'display:none', [2 + k]: 'display:inline', 27: 'display:none' },
  };
}
const search = choreograph('search', 32, searchTracks);

function Result({ i }: { i: number }) {
  const y = 12 + 8 * i;
  return (
    <>
      {i > 0 && <Px ink={rect(5, y, 1, 8) + art(HASH, 8, y + 2)} />}
      <Text x={i === 0 ? 4 : 15} y={y} h={8}>
        {RESULTS[i]}
      </Text>
    </>
  );
}

function SearchMechanism() {
  const c = search.cls;
  const typed = [];
  for (let k = 0; k < QUERY.length; k++) {
    typed.push(
      <span key={k} className={c[`key${k}`]}>
        {QUERY[k]}
      </span>,
    );
  }
  const results = [];
  for (let i = 0; i < RESULTS.length; i++) {
    results.push(
      <Layer key={`r${i}`} className={c[`row${i}`]}>
        <Result i={i} />
      </Layer>,
      <Layer key={`s${i}`} className={`bt-on-hi ${c[`sel${i}`]}`}>
        <Px hi={rect(1, 12 + 8 * i, 94, 8)} />
        <Result i={i} />
      </Layer>,
    );
  }

  return (
    <Stage c={search}>
      <Px
        ink={frame(0, 0, 96, 40) + rect(0, 10, 96, 1) + art(MAGNIFIER, 3, 2) + frame(80, 2, 14, 7)}
      />
      <Text x={80} y={2} w={14} h={7} className="justify-center">
        ESC
      </Text>
      <Text x={12} y={2} h={7}>
        {typed}
        <span className={`ms-[0.15em] h-[1lh] w-[0.5em] bg-lp-orange ${c.caret}`} />
      </Text>
      {results}
      <Px ink={rect(0, 0, 96, 40)} className={c.flash} />
    </Stage>
  );
}

// OpenAPI: the playground: Send, a packet runs to the server and back with the status code
// operations of the Scalar Galaxy example spec and their success codes
const METHODS = ['GET', 'POST', 'GET', 'DELETE'];
const PATHS = ['/planets', '/planets', '/planets/{planetId}', '/planets/{planetId}'];
const CODES = ['200', '201', '200', '204'];

/** a packet stepping `dx` px from tick `from` to `to`, gone a tick later */
function packet(from: number, to: number, dx: number): Track {
  return {
    base: 'opacity:0',
    poses: {
      [from]: steps(to - from, 'opacity:1;transform:translateX(0)'),
      [to]: `opacity:1;transform:translateX(${dx}px)`,
      [to + 1]: 'opacity:0',
    },
  };
}

const openapi = choreograph('openapi', 32, {
  operation: cycle(7, 32, 4),
  press: { base: 'opacity:0', poses: show(2, 3) },
  out: packet(3, 11, 144),
  back: packet(15, 23, -135),
  ledA: { base: 'opacity:0', poses: show(11, 12, 13, 14, 15, 16) },
  ledB: { base: 'opacity:0', poses: show(12, 13, 14, 15) },
  status: { poses: pop(23, 30) },
  line0: { poses: pop(24, 30) },
  line1: { poses: pop(25, 30) },
  line2: { poses: pop(26, 30) },
});

function OpenAPIMechanism() {
  const c = openapi.cls;
  let server = frame(72, 8, 24, 24) + rect(75, 32, 4, 2) + rect(89, 32, 4, 2);
  for (let k = 0; k < 3; k++) {
    server += frame(74, 10 + 7 * k, 13, 5) + rect(76, 12 + 7 * k, 9, 1);
    server += rect(89, 11 + 7 * k, 2, 2) + rect(92, 11 + 7 * k, 2, 2);
  }

  return (
    <Stage c={openapi}>
      <Clip x={0} y={0} w={18} h={7}>
        <Strip
          items={METHODS}
          h={7}
          loop
          itemClassName="flex size-full items-center justify-center bg-lp-orange font-mono text-(--bt-paper)"
          className={c.operation}
        />
      </Clip>
      <Clip x={20} y={0} w={76} h={7}>
        <Strip items={PATHS} h={7} loop itemClassName="font-mono" className={c.operation} />
      </Clip>
      <Px ink={frame(0, 10, 22, 9) + art(PLAY, 3, 12) + dashes(23, 14, 49, 1, 2) + server} />
      <Text x={8} y={10} h={9}>
        Send
      </Text>
      <Layer className={c.press}>
        <Px ink={rect(0, 10, 22, 9)} knock={art(PLAY, 3, 12)} />
        <Text x={8} y={10} h={9} className="text-(--bt-paper)">
          Send
        </Text>
      </Layer>
      <Px x={24} y={13} w={3} h={3} orange={rect(0, 0, 3, 3)} className={c.out} />
      <Px x={69} y={13} w={3} h={3} ink={rect(0, 0, 3, 3)} className={c.back} />
      <Px
        orange={rect(89, 11, 2, 2) + rect(92, 18, 2, 2) + rect(89, 25, 2, 2)}
        className={c.ledA}
      />
      <Px
        orange={rect(92, 11, 2, 2) + rect(89, 18, 2, 2) + rect(92, 25, 2, 2)}
        className={c.ledB}
      />
      <Px orange={rect(92, 25, 2, 2)} />
      <Clip x={0} y={22} w={12} h={7} className={c.status}>
        <Strip
          items={CODES}
          h={7}
          loop
          itemClassName="font-mono text-(--bt-orange)"
          className={c.operation}
        />
      </Clip>
      <Px ink={rect(0, 31, 30, 1)} className={c.line0} />
      <Px ink={rect(3, 34, 42, 1)} className={c.line1} />
      <Px ink={rect(3, 37, 26, 1)} className={c.line2} />
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
      <Px ink={frame(0, 1, 20, 7)} />
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
      <Px
        ink={
          pipe + frame(84, 11, 12, 21) + rect(89, 4, 2, 7) + rect(87, 15, 6, 5) + rect(88, 24, 4, 1)
        }
        knock={rect(84, 16, 1, 11)}
      />
      <Px orange={rect(88, 2, 4, 2)} />
      <Px orange={art(ARC_LEFT, 84, 1) + art(ARC_RIGHT, 93, 1)} className={c.arcs} />
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
  let ink = '';
  const labels = [];
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
      <Layer key={`hl-${field}`} className={`bt-on-hi ${hlCls[i]}`}>
        <Px hi={rect(x + 1, y + 6 + 6 * row, 26, 6)} />
        <Text x={x + 2} y={y + 6 + 6 * row} h={6} className="font-mono">
          {field}
        </Text>
      </Layer>,
    );
  }

  return (
    <Stage c={graphql}>
      <Px ink={ink} />
      {labels}
      <Px x={28} y={6} w={6} h={5} ink={EDGE} className={c.edge1} />
      <Px x={62} y={18} w={6} h={5} ink={EDGE} className={c.edge2} />
      <Layer className={c.flash1}>
        <Px paper={rect(35, 7, 26, 4)} />
        <Text x={36} y={6} h={6} className="font-mono">
          Customer
        </Text>
      </Layer>
      <Layer className={c.flash2}>
        <Px paper={rect(69, 19, 26, 4)} />
        <Text x={70} y={18} h={6} className="font-mono">
          Order
        </Text>
      </Layer>
    </Stage>
  );
}

// AI Chat: Ask AI: a question, the docs search tool runs, the answer streams in block by block
// x, y of the twelve cells around a 5x5 ring, clockwise from the top
const RING = [1, 0, 2, 0, 3, 0, 4, 1, 4, 2, 4, 3, 3, 4, 2, 4, 1, 4, 0, 3, 0, 2, 0, 1];

/** six frames of a spinner stacked vertically, a four-cell arc stepping two cells a frame */
function spinner(): string {
  let d = '';
  for (let f = 0; f < 6; f++) {
    for (let j = 0; j < 4; j++) {
      const k = 2 * ((2 * f + j) % 12);
      d += rect(RING[k], RING[k + 1] + 5 * f, 1, 1);
    }
  }
  return d;
}

const chat = choreograph('chat', 32, {
  ask: { poses: pop(2, 29) },
  tool: { poses: pop(4, 29) },
  spin: { ticks: 6, poses: { 0: steps(6, up(0)), 6: up(30) } },
  searching: { base: 'opacity:0', poses: show(4, 10) },
  searched: { poses: show(10, 29) },
  label: { base: up(7), poses: { 0: up(0), 10: up(7) } },
  count: { poses: pop(10, 29) },
  answer0: { poses: pop(12, 29) },
  answer1: { poses: pop(13, 29) },
  code: { poses: pop(15, 29) },
  answer2: { poses: pop(17, 29) },
});

function AIChatMechanism() {
  const c = chat.cls;
  return (
    <Stage c={chat}>
      <Layer className={c.ask}>
        <Px
          ink={frame(46, 0, 50, 9) + rect(50, 3, 34, 1) + rect(50, 5, 20, 1)}
          paper={rect(47, 1, 48, 7)}
        />
      </Layer>
      <Layer className={c.tool}>
        <Clip x={0} y={13} w={5} h={5} className={c.searching}>
          <Px w={5} h={30} ink={spinner()} className={c.spin} />
        </Clip>
        <Px ink={art(MAGNIFIER, 0, 12)} className={c.searched} />
        <Clip x={9} y={11} w={30} h={7}>
          <Strip items={['Searching', 'Searched']} h={7} className={c.label} />
        </Clip>
      </Layer>
      <Text x={39} y={11} h={7} className={`opacity-55 ${c.count}`}>
        3 results
      </Text>
      <Px ink={rect(0, 22, 76, 1)} className={c.answer0} />
      <Px ink={rect(0, 24, 58, 1)} className={c.answer1} />
      <Px
        ink={rect(0, 27, 64, 7)}
        knock={rect(3, 29, 24, 1) + rect(3, 31, 36, 1)}
        className={c.code}
      />
      <Px ink={rect(0, 36, 42, 1)} className={c.answer2} />
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
  title: { poses: pop(2, 28) },
  description: { poses: pop(5, 28) },
  heading: { poses: pop(8, 28) },
  paragraph: { poses: pop(11, 28) },
  fence: { poses: pop(14, 28) },
  code: { poses: pop(15, 28) },
  close: { poses: pop(16, 28) },
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
          frame(34, 4, 62, 35)
        }
        knock={rect(5, 27, 10, 1) + rect(5, 29, 14, 1) + rect(5, 31, 8, 1)}
        orange={art(PLAY, 28, 19)}
      />
      <Text x={34} y={0} h={4} className="bt-code opacity-55">
        /docs/markdown/twoslash.md
      </Text>
      <Px x={1} y={7} w={24} h={1} orange={rect(0, 0, 24, 1)} className={c.beam} />
      <Layer className={c.title}>
        <Text x={37} y={7} h={3} className="bt-code">
          #
        </Text>
        <Px ink={rect(41, 8, 22, 1)} />
      </Layer>
      <Px ink={rect(37, 12, 40, 1)} className={c.description} />
      <Layer className={c.heading}>
        <Text x={37} y={15} h={3} className="bt-code">
          ##
        </Text>
        <Px ink={rect(43, 16, 12, 1)} />
      </Layer>
      <Px ink={rect(37, 20, 50, 1) + rect(37, 22, 36, 1)} className={c.paragraph} />
      <Text x={37} y={25} h={3} className={`bt-code ${c.fence}`}>
        ```ts
      </Text>
      <Px ink={rect(39, 30, 30, 1)} className={c.code} />
      <Text x={37} y={33} h={3} className={`bt-code ${c.close}`}>
        ```
      </Text>
    </Stage>
  );
}

// i18n: a split-flap display: the locale and the translated `On this page` flip together
// `On this page` of the table of contents in @fumadocs/language
const LOCALES = ['en', 'zh-cn', 'zh-tw'];
const LABELS = ['On this page', '本页目录', '本頁目錄'];

/** a flap folding through `scales` from tick `offset` of each flip, on ticks 0, 16 and 32 */
function flips(offset: number, scales: number[]): Poses {
  const poses: Record<number, string> = { 0: 'transform:scaleY(0)' };
  for (let t = 0; t < 48; t += 16) {
    for (let j = 0; j < scales.length; j++) {
      poses[t + offset + j] = `transform:scaleY(${scales[j]})`;
    }
  }
  return poses;
}

// rows of a face are 17 cells: the top flap folds down over 2 ticks, the bottom one lands on 3
const i18n = choreograph('i18n', 48, {
  now: { poses: { 0: up(0), 16: up(17), 32: up(34) } },
  prev: { poses: { 0: up(34), 16: up(0), 32: up(17) } },
  bottom: { poses: { 0: up(34), 3: up(0), 19: up(17), 35: up(34) } },
  fallTop: { base: 'transform-origin:50% 100%;transform:scaleY(0)', poses: flips(0, [1, 0.5, 0]) },
  fallBottom: { base: 'transform-origin:50% 0;transform:scaleY(0)', poses: flips(2, [0.5, 1, 0]) },
});

// a face is 51px: two 25px halves around a 1px cut
const HALF = 25 / 3;
const LOW = 26 / 3;

interface FlapProps {
  x: number;
  y: number;
  w: number;
  values: readonly string[];
  /** the values are codes, like a locale's */
  code?: boolean;
}

/** a split-flap unit, 17 cells tall; static halves under the falling flaps */
function Flap({ x, y, w, values, code }: FlapProps) {
  const c = i18n.cls;
  const faces = (className: string) => (
    <Strip
      items={values}
      h={17}
      itemClassName={code ? 'bt-flap-face font-mono' : 'bt-flap-face'}
      className={className}
    />
  );
  return (
    <>
      <Px x={x} y={y} w={w} h={17} ink={rect(0, 0, w, 17)} />
      <Clip x={x} y={y} w={w} h={HALF}>
        {faces(c.now)}
      </Clip>
      <Clip x={x} y={y + LOW} w={w} h={HALF}>
        {faces(`-top-[26px] ${c.bottom}`)}
      </Clip>
      <Clip x={x} y={y} w={w} h={HALF} className={c.fallTop}>
        {faces(c.prev)}
      </Clip>
      <Clip x={x} y={y + LOW} w={w} h={HALF} className={c.fallBottom}>
        {faces(`-top-[26px] ${c.now}`)}
      </Clip>
      <Px x={x} y={y} w={w} h={17} knock={rect(0, 8, 1, 1) + rect(w - 1, 8, 1, 1)} />
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

/** visible on every other tick while printing (2-18), `first` on the even ones */
function turn(first: boolean): Poses {
  const poses: Record<number, string> = { 0: first ? 'opacity:1' : 'opacity:0' };
  for (let t = 2; t <= 18; t++) poses[t] = (t % 2 === 0) === first ? 'opacity:1' : 'opacity:0';
  return poses;
}

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
  gear: { poses: turn(true) },
  gearTurned: { base: 'opacity:0', poses: turn(false) },
  led: { base: 'opacity:0', poses: show(2, 18) },
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
      <Px ink={rect(1, 6, 62, 32)} className={c.flash} />
      <Px
        x={0}
        y={4}
        w={76}
        h={3}
        ink={rect(0, 1, 70, 1) + rect(26, 0, 12, 3) + rect(70, 0, 6, 3)}
        orange={rect(30, 1, 4, 1)}
        className={c.head}
      />
      <Px ink={art(GEAR, 72, 2)} className={c.gear} />
      <Px ink={art(GEAR_TURNED, 72, 2)} className={c.gearTurned} />
      <Px orange={rect(76, 2, 1, 1)} className={c.led} />
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
  popup: { poses: pop(6, 24) },
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
      <Layer className={c.popup}>
        {/* the popup's frame is a cell thick and as wide as its type */}
        <Text
          x={15}
          y={3}
          h={9}
          className="bt-code border-[3px] border-(--bt-ink) bg-(--bt-paper) px-[3px]"
        >
          <span className="text-(--bt-orange)">const</span> player: Player
        </Text>
        <Px ink={rect(20, 12, 1, 1)} />
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
  row0: { poses: pop(1, 29) },
  row1: { poses: pop(2, 29) },
  row2: { poses: pop(3, 29) },
  closed: { base: 'opacity:0', poses: show(3, 7, 24, 29) },
  open: { poses: show(7, 24) },
  type: { poses: pop(8, 24) },
  default: { poses: pop(9, 24) },
});

function TypeTableMechanism() {
  const c = table.cls;
  const rowCls = [c.row0, c.row1, c.row2];
  const rows = [];
  for (let i = 0; i < PROPS.length; i++) {
    rows.push(
      <Layer key={PROPS[i]} className={rowCls[i]}>
        <Px
          ink={dashes(1, 14 + 6 * i, 94, 1, 1) + (i < 2 ? art(CHEVRON_DOWN, 88, 10 + 6 * i) : '')}
        />
        <Text x={3} y={9 + 6 * i} h={5} className="bt-code">
          {PROPS[i]}
        </Text>
      </Layer>,
    );
  }

  return (
    <Stage c={table}>
      <Px ink={frame(0, 0, 96, 40) + dashes(1, 8, 94, 1, 1)} />
      <Text x={3} y={1} h={7} className="opacity-55">
        Prop
      </Text>
      {rows}
      <Px ink={art(CHEVRON_DOWN, 88, 22)} className={c.closed} />
      <Layer className={`bt-on-hi ${c.open}`}>
        <Px hi={rect(1, 20, 94, 6)} ink={art(CHEVRON_UP, 88, 22)} />
        <Text x={3} y={21} h={5} className="bt-code">
          options?
        </Text>
      </Layer>
      <Layer className={c.type}>
        <Text x={4} y={28} h={5} className="opacity-55">
          Type
        </Text>
        <Text x={24} y={28} h={5} className="bt-code">
          {'Partial<{ a: unknown }>'}
        </Text>
      </Layer>
      <Layer className={c.default}>
        <Text x={4} y={33} h={5} className="opacity-55">
          Default
        </Text>
        <Text x={24} y={33} h={5} className="bt-code">
          {'{ a: "test" }'}
        </Text>
      </Layer>
    </Stage>
  );
}

// Story: the docs story of `Callout`: the Variant select flips the preview from Default to Warning
const INFO = ['.#####.', '#.....#', '#..#..#', '#.....#', '#..#..#', '#..#..#', '.#####.'];
// the variants of the `Callout` story in the docs
const VARIANTS = ['Default', 'Warning'];

// the select opens on 5, picks Warning on 7 and closes on 10; back to Default on 24
const story = choreograph('story', 32, {
  menu: { base: 'opacity:0', poses: pop(5, 10) },
  pick0: { poses: show(0, 7) },
  pick1: { base: 'opacity:0', poses: show(7, 32) },
  value: { base: up(7), poses: { 0: up(0), 9: up(3.5), 10: up(7), 23: up(3.5), 24: up(0) } },
  warning: { poses: pop(10, 24) },
  info: { base: 'opacity:0', poses: show(0, 10, 24) },
});

function StoryMechanism() {
  const c = story.cls;
  const pickCls = [c.pick0, c.pick1];
  const picks = [];
  for (let i = 0; i < VARIANTS.length; i++) {
    picks.push(
      <Layer key={VARIANTS[i]} className={`bt-on-hi ${pickCls[i]}`}>
        <Px hi={rect(64, 8 + 7 * i, 31, 7)} />
        <Text x={66} y={8 + 7 * i} h={7}>
          {VARIANTS[i]}
        </Text>
      </Layer>,
    );
  }

  return (
    <Stage c={story}>
      <Text x={0} y={0} h={7}>
        Callout
      </Text>
      <Text x={44} y={0} h={7} className="opacity-55">
        Variant
      </Text>
      <Clip x={65} y={0} w={22} h={7}>
        <Strip items={VARIANTS} h={7} className={c.value} />
      </Clip>
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
      <Px ink={art(INFO, 9, 15)} className={c.info} />
      <Px
        orange={art(WARNING, 9, 15) + rect(6, 12, 2, 13)}
        paper={rect(9, 15, 7, 7)}
        className={c.warning}
      />
      <Layer className={c.menu}>
        <Px paper={rect(63, 7, 33, 16)} ink={frame(63, 7, 33, 16)} />
        <Text x={66} y={8} h={7}>
          {VARIANTS[0]}
        </Text>
        <Text x={66} y={15} h={7}>
          {VARIANTS[1]}
        </Text>
        {picks}
      </Layer>
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
  hl0: { base: 'opacity:0', poses: show(2, 6) },
  hl1: { base: 'opacity:0', poses: show(10, 14) },
  hl2: { base: 'opacity:0', poses: show(18, 22) },
  link0: draw(2, 4, 28),
  link1: draw(10, 4, 28),
  link2: draw(18, 4, 28),
  note: { poses: pop(6, 28) },
  callout: { poses: pop(14, 28) },
  image: { poses: pop(22, 28, [4, 8, 12]) },
});

function ObsidianMechanism() {
  const c = obsidian.cls;
  const hlCls = [c.hl0, c.hl1, c.hl2];
  const linkCls = [c.link0, c.link1, c.link2];
  const lines = [];
  for (let i = 0; i < LINES.length; i++) {
    const y = 10 + 9 * i;
    lines.push(
      // the line, and its link drawn on to the page's column
      <Text key={i} x={2} y={y} w={54} h={5} className="bt-code">
        <span className="px-[3px]">{LINES[i]}</span>
        <span className={`bt-dashes flex-1 ${linkCls[i]}`} />
      </Text>,
      <Layer key={`hl${i}`} className={`bt-on-hi ${hlCls[i]}`}>
        <Text x={2} y={y} h={5} className="bt-code">
          <span className="flex items-center self-stretch bg-lp-yellow px-[3px]">{LINES[i]}</span>
        </Text>
      </Layer>,
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
      {lines}
      <Layer className={c.note}>
        <Px ink={frame(56, 7, 40, 10)} paper={rect(57, 8, 38, 8)} />
        <Text x={58} y={8} h={8} className="text-lp-orange underline underline-offset-2">
          create a link
        </Text>
      </Layer>
      <Px
        ink={frame(56, 18, 40, 8) + rect(64, 21, 22, 2)}
        orange={rect(56, 18, 2, 8) + art(WARNING, 59, 19)}
        className={c.callout}
      />
      <Px
        ink={rect(56, 27, 40, 13)}
        knock={art(TREE, 68, 28) + dither(71, 32, 9, 3, 12) + dither(70, 35, 11, 3, 8)}
        orange={art(TREE, 68, 28, 'o')}
        className={`bt-ink-card ${c.image}`}
      />
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
