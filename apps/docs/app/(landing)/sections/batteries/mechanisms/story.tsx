import { choreograph, pop, show, up } from '../choreography';
import { art, dither, frame, rect } from '../px';
import { CHEVRON_DOWN, WARNING } from '../sprites';
import { Clip, Layer, Px, Stage, Strip, Text } from '../stage';

const INFO = ['.#####.', '#.....#', '#..#..#', '#.....#', '#..#..#', '#..#..#', '.#####.'];
// the variants of the `Callout` story in the docs
const VARIANTS = ['Default', 'Warning'];

// the select opens on 5, picks Warning on 7 and closes on 10; back to Default on 24
const story = choreograph('story', 32, {
  menu: { base: 'opacity:0', poses: pop(5, 10) },
  pick0: { poses: show(0, 7) },
  pick1: { base: 'opacity:0', poses: show(7, 32) },
  value: {
    base: up(7),
    poses: [
      [0, up(0)],
      [9, up(3.5)],
      [10, up(7)],
      [23, up(3.5)],
      [24, up(0)],
    ],
  },
  warning: { poses: pop(10, 24) },
  info: {
    base: 'opacity:0',
    poses: [
      [0, 'opacity:1'],
      [10, 'opacity:0'],
      [24, 'opacity:1'],
    ],
  },
});

/** the docs story of `Callout`: the Variant select flips the preview from Default to Warning */
export function StoryMechanism() {
  const c = story.cls;
  const values = [];
  const picks = [];
  const pickCls = [c.pick0, c.pick1];
  for (let i = 0; i < VARIANTS.length; i++) {
    values.push(<span className="bt-text">{VARIANTS[i]}</span>);
    picks.push(
      <Layer key={VARIANTS[i]} className={`bt-on-hi ${pickCls[i]}`}>
        <Px hi={rect(64, 8 + 7 * i, 31, 7)} />
        <Text x={66} y={8.9 + 7 * i}>
          {VARIANTS[i]}
        </Text>
      </Layer>,
    );
  }

  return (
    <Stage c={story}>
      <Text x={0} y={0.9}>
        Callout
      </Text>
      <Text x={44} y={0.9} className="bt-dim">
        Variant
      </Text>
      <Clip x={65} y={0} w={22} h={7}>
        <Strip items={values} h={7} className={c.value} />
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
      <Text x={2} y={33.4} className="bt-dim">
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
        <Text x={66} y={8.9}>
          {VARIANTS[0]}
        </Text>
        <Text x={66} y={15.9}>
          {VARIANTS[1]}
        </Text>
        {picks}
      </Layer>
    </Stage>
  );
}
