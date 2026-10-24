import { choreograph, pop, show } from '../choreography';
import { art, dashes, frame, rect } from '../px';
import { CHEVRON_DOWN, CHEVRON_UP } from '../sprites';
import { Layer, Px, Stage, Text } from '../stage';

// the props of the auto-type-table docs example
const PROPS = ['name', 'fn', 'options?'];

const table = choreograph('table', 32, {
  row0: { poses: pop(1, 29) },
  row1: { poses: pop(2, 29) },
  row2: { poses: pop(3, 29) },
  // `options?` is open from tick 7 to 24
  closed: {
    base: 'opacity:0',
    poses: [
      [0, 'opacity:0'],
      [3, 'opacity:1'],
      [7, 'opacity:0'],
      [24, 'opacity:1'],
      [29, 'opacity:0'],
    ],
  },
  open: { poses: show(7, 24) },
  type: { poses: pop(8, 24) },
  default: { poses: pop(9, 24) },
});

/** rows are generated one by one, then `options?` opens to its type and default */
export function TypeTableMechanism() {
  const c = table.cls;
  const rowCls = [c.row0, c.row1, c.row2];
  const rows = [];
  for (let i = 0; i < PROPS.length; i++) {
    rows.push(
      <Layer key={PROPS[i]} className={rowCls[i]}>
        <Px
          ink={dashes(1, 14 + 6 * i, 94, 1, 1) + (i < 2 ? art(CHEVRON_DOWN, 88, 10 + 6 * i) : '')}
        />
        <Text x={3} y={9.5 + 6 * i} className="bt-code">
          {PROPS[i]}
        </Text>
      </Layer>,
    );
  }

  return (
    <Stage c={table}>
      <Px ink={frame(0, 0, 96, 40) + dashes(1, 8, 94, 1, 1)} />
      <Text x={3} y={2.4} className="bt-dim">
        Prop
      </Text>
      {rows}
      <Px ink={art(CHEVRON_DOWN, 88, 22)} className={c.closed} />
      <Layer className={`bt-on-hi ${c.open}`}>
        <Px hi={rect(1, 20, 94, 6)} ink={art(CHEVRON_UP, 88, 22)} />
        <Text x={3} y={21.5} className="bt-code">
          options?
        </Text>
      </Layer>
      <Layer className={c.type}>
        <Text x={4} y={28.4} className="bt-dim">
          Type
        </Text>
        <Text x={24} y={28.9} className="bt-code">
          {'Partial<{ a: unknown }>'}
        </Text>
      </Layer>
      <Layer className={c.default}>
        <Text x={4} y={33.4} className="bt-dim">
          Default
        </Text>
        <Text x={24} y={33.9} className="bt-code">
          {'{ a: "test" }'}
        </Text>
      </Layer>
    </Stage>
  );
}
