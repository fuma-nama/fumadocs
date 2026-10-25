import { choreograph, pop, show, type Track } from '../choreography';
import { art, frame, rect } from '../px';
import { MAGNIFIER } from '../sprites';
import { Layer, Px, Stage, Text } from '../stage';

const HASH = ['.#.#.', '#####', '.#.#.', '#####', '.#.#.'];
const QUERY = 'twoslash';
// what searching `twoslash` returns on fumadocs.dev: the page and its sections
const RESULTS = ['Twoslash', 'Usage', 'Cache'];

const tracks: Record<string, Track> = {
  caret: {
    poses: [
      [0, 'opacity:1'],
      [1, 'opacity:0'],
      [2, 'opacity:1'],
      [12, 'opacity:0'],
      [14, 'opacity:1'],
      [16, 'opacity:0'],
      [18, 'opacity:1'],
      [20, 'opacity:0'],
      [22, 'opacity:1'],
      [29, 'opacity:0'],
      [31, 'opacity:1'],
    ],
  },
  row0: { poses: pop(10, 27) },
  row1: { poses: pop(11, 27) },
  row2: { poses: pop(12, 27) },
  sel0: { poses: show(10, 16) },
  sel1: { base: 'opacity:0', poses: show(16, 20) },
  sel2: { base: 'opacity:0', poses: show(20, 26) },
  // enter
  flash: { base: 'opacity:0', poses: show(26, 27) },
};
// the query is typed one glyph per tick (2-10) and cleared on 27; Geist Pixel is proportional,
// so glyphs appear one by one and the caret follows them inline
for (let k = 0; k < QUERY.length; k++) {
  tracks[`key${k}`] = {
    poses: [
      [0, 'display:none'],
      [2 + k, 'display:inline'],
      [27, 'display:none'],
    ],
  };
}

const search = choreograph('search', 32, tracks);

function Result({ i }: { i: number }) {
  const y = 12 + 8 * i;
  if (i === 0) {
    return (
      <Text x={4} y={y + 1.7}>
        {RESULTS[i]}
      </Text>
    );
  }
  return (
    <>
      <Px ink={rect(5, y, 1, 8) + art(HASH, 8, y + 2)} />
      <Text x={15} y={y + 1.7}>
        {RESULTS[i]}
      </Text>
    </>
  );
}

/** the search dialog: `twoslash` is typed, results pop, the selection steps down, enter */
export function SearchMechanism() {
  const c = search.cls;
  const typed = [];
  for (let k = 0; k < QUERY.length; k++) {
    typed.push(
      <span key={k} className={c[`key${k}`]}>
        {QUERY[k]}
      </span>,
    );
  }
  const rowCls = [c.row0, c.row1, c.row2];
  const selCls = [c.sel0, c.sel1, c.sel2];
  const results = [];
  for (let i = 0; i < RESULTS.length; i++) {
    results.push(
      <Layer key={`r${i}`} className={rowCls[i]}>
        <Result i={i} />
      </Layer>,
      <Layer key={`s${i}`} className={`bt-on-hi ${selCls[i]}`}>
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
      <Text x={82} y={3.4} className="text-[10px]">
        ESC
      </Text>
      <Text x={12} y={3.3}>
        {typed}
        <span className={`bt-caret bt-blink ${c.caret}`} />
      </Text>
      {results}
      <Px ink={rect(0, 0, 96, 40)} className={c.flash} />
    </Stage>
  );
}
