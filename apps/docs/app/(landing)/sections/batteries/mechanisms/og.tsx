import { choreograph, type Pose, show } from '../choreography';
import { art, dashes, dither, frame, rect } from '../px';
import { Layer, Px, Stage, Text } from '../stage';

const RING = ['.###.', '#...#', '#...#', '#...#', '.###.'];
const GEAR = ['.#.', '###', '.#.'];
const GEAR_TURNED = ['#.#', '.#.', '#.#'];

/** visible on every other tick while printing (2-17), `first` on the even ones */
function turn(first: boolean): Pose[] {
  const poses: Pose[] = [[0, first ? 'opacity:1' : 'opacity:0']];
  for (let t = 2; t < 18; t++) {
    const even = t % 2 === 0;
    poses.push([t, even === first ? 'opacity:1' : 'opacity:0']);
  }
  poses.push([18, first ? 'opacity:1' : 'opacity:0']);
  return poses;
}

// prints 32 rows in 16 steps (ticks 2-18), the card holds, the head parks back on 25-27
const og = choreograph('og', 32, {
  cover: {
    base: 'transform-origin:50% 100%;transform:scaleY(0)',
    poses: [
      [0, 'transform:scaleY(1)'],
      [2, 'transform:scaleY(1)', 16],
      [18, 'transform:scaleY(0)'],
      [27, 'transform:scaleY(1)'],
    ],
  },
  head: {
    base: 'transform:translateY(96px)',
    poses: [
      [0, 'transform:translateY(0)'],
      [2, 'transform:translateY(0)', 16],
      [18, 'transform:translateY(96px)'],
      [25, 'transform:translateY(96px)', 2],
      [27, 'transform:translateY(0)'],
    ],
  },
  gear: { poses: turn(true) },
  gearTurned: { base: 'opacity:0', poses: turn(false) },
  led: { base: 'opacity:0', poses: show(2, 18) },
  flash: { base: 'opacity:0', poses: show(18, 19) },
});

/** a print head prints the default `generateOGImage` card, 1200x630, line by line */
export function OGMechanism() {
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
      <Text x={24} y={0.1} className="bt-code">
        1200×630
      </Text>
      <Layer className="bt-ink-card">
        <Px
          ink={rect(1, 6, 62, 32)}
          knock={dither(5, 14, 44, 2, 12) + dither(5, 18, 30, 2, 12)}
          orange={dashes(5, 22, 54, 3, 2) + art(RING, 5, 28) + rect(1, 36, 62, 2)}
        />
        <Text x={5} y={7.8} className="bt-knock">
          Twoslash
        </Text>
        <Text x={12} y={27.9} className="bt-orange-text">
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
