import { choreograph, develop, type Pose, pop, show } from '../choreography';
import { art, dashes, dither, frame, rect } from '../px';
import { WARNING } from '../sprites';
import { Layer, Px, Stage, Text } from '../stage';

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

/** a connector drawn in four steps from tick `from`, cleared on 28 */
function connect(from: number): Pose[] {
  return [
    [0, 'transform:scaleX(0)'],
    [from, 'transform:scaleX(0)', 4],
    [from + 4, 'transform:scaleX(1)'],
    [28, 'transform:scaleX(0)'],
  ];
}

// each syntax renders in turn: highlighted, connected, then shown on the right
const obsidian = choreograph('obsidian', 32, {
  hl0: { base: 'opacity:0', poses: show(2, 6) },
  hl1: { base: 'opacity:0', poses: show(10, 14) },
  hl2: { base: 'opacity:0', poses: show(18, 22) },
  link0: { base: 'transform-origin:left', poses: connect(2) },
  link1: { base: 'transform-origin:left', poses: connect(10) },
  link2: { base: 'transform-origin:left', poses: connect(18) },
  note: { poses: pop(6, 28) },
  callout: { poses: pop(14, 28) },
  image: { poses: develop(22, 28) },
});

/** a vault note: its wikilink, callout and embed render one by one into the docs page */
export function ObsidianMechanism() {
  const c = obsidian.cls;
  const hlCls = [c.hl0, c.hl1, c.hl2];
  const lines = [];
  for (let i = 0; i < LINES.length; i++) {
    const y = 10 + 9 * i;
    lines.push(
      <Text key={i} x={3} y={y + 0.7} className="bt-code">
        {LINES[i]}
      </Text>,
      <Layer key={`hl${i}`} className={`bt-on-hi ${hlCls[i]}`}>
        <Px hi={rect(2, y, LINES[i].length * 2 + 2, 5)} />
        <Text x={3} y={y + 0.7} className="bt-code">
          {LINES[i]}
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
      <Text x={3} y={1.6}>
        Welcome
      </Text>
      {lines}
      <Px x={38} y={12} w={18} h={1} ink={dashes(0, 0, 18, 2, 1)} className={c.link0} />
      <Px x={28} y={21} w={28} h={1} ink={dashes(0, 0, 28, 2, 1)} className={c.link1} />
      <Px x={30} y={30} w={26} h={1} ink={dashes(0, 0, 26, 2, 1)} className={c.link2} />
      <Layer className={c.note}>
        <Px ink={frame(56, 7, 40, 10)} paper={rect(57, 8, 38, 8)} />
        <Text x={58} y={9.6} className="bt-link">
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
