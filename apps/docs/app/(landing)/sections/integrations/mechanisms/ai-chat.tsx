import { choreograph, pop, show, up } from '../choreography';
import { art, frame, rect } from '../px';
import { MAGNIFIER } from '../sprites';
import { Clip, Layer, Px, Stage, Strip, Text } from '../stage';

// the twelve cells around a 5x5 ring, clockwise from the top
const RING = [
  [1, 0],
  [2, 0],
  [3, 0],
  [4, 1],
  [4, 2],
  [4, 3],
  [3, 4],
  [2, 4],
  [1, 4],
  [0, 3],
  [0, 2],
  [0, 1],
];

/** six frames of a spinner stacked vertically, a four-cell arc stepping two cells a frame */
function spinner(): string {
  let d = '';
  for (let f = 0; f < 6; f++) {
    for (let j = 0; j < 4; j++) {
      const [x, y] = RING[(2 * f + j) % RING.length];
      d += rect(x, y + 5 * f, 1, 1);
    }
  }
  return d;
}

const chat = choreograph('chat', 32, {
  ask: { poses: pop(2, 29) },
  tool: { poses: pop(4, 29) },
  spin: {
    ticks: 6,
    poses: [
      [0, up(0), 6],
      [6, up(30)],
    ],
  },
  searching: { base: 'opacity:0', poses: show(4, 10) },
  searched: { poses: show(10, 29) },
  label: {
    base: up(7),
    poses: [
      [0, up(0)],
      [10, up(7)],
    ],
  },
  count: { poses: pop(10, 29) },
  // the answer streams in block by block
  answer0: { poses: pop(12, 29) },
  answer1: { poses: pop(13, 29) },
  code: { poses: pop(15, 29) },
  answer2: { poses: pop(17, 29) },
});

/** Ask AI: a question, the docs search tool runs, the answer streams in block by block */
export function AIChatMechanism() {
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
          <Strip
            items={[
              <span key="searching" className="bt-text">
                Searching
              </span>,
              <span key="searched" className="bt-text">
                Searched
              </span>,
            ]}
            h={7}
            className={c.label}
          />
        </Clip>
      </Layer>
      <Text x={39} y={12.4} className={`bt-dim ${c.count}`}>
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
