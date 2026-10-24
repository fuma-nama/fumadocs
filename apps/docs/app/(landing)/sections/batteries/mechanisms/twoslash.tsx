import { choreograph, pop } from '../choreography';
import { art, frame, rect } from '../px';
import { Clip, Layer, Px, Stage, Text } from '../stage';

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
const REST = 'transform:translate(153px,51px)';

const twoslash = choreograph('twoslash', 32, {
  pointer: {
    poses: [
      [0, REST],
      [1, REST, 4],
      [5, 'transform:translate(0,0)'],
      [24, 'transform:translate(0,0)', 4],
      [28, REST],
    ],
  },
  popup: { poses: pop(6, 24) },
});

/** a code block of the docs example: hovering `player` pops its type from the compiler */
export function TwoslashMechanism() {
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
      <Clip x={1} y={1} w={94} h={38}>
        <Text x={4} y={14.2} className="bt-code">
          <span className="bt-orange-text">const</span>
          {" player: Player = { name: 'Hello World' };"}
        </Text>
      </Clip>
      <Layer className={c.popup}>
        <Px paper={rect(15, 3, 44, 9)} ink={frame(15, 3, 44, 9) + rect(20, 12, 1, 1)} />
        <Text x={17} y={5.6} className="bt-code">
          <span className="bt-orange-text">const</span> player: Player
        </Text>
      </Layer>
      <Px
        x={21}
        y={17}
        w={7}
        h={10}
        ink={art(POINTER, 0, 0)}
        paper={art(POINTER, 0, 0, 'o')}
        className={c.pointer}
      />
    </Stage>
  );
}
