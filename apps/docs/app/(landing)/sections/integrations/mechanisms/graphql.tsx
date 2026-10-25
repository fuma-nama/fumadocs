import { choreograph, type Pose, show } from '../choreography';
import { art, frame, rect } from '../px';
import { Layer, Px, Stage, Text } from '../stage';

const EDGE = rect(0, 2, 6, 1) + art(['#..', '##.', '###', '##.', '#..'], 3, 0);

// types of the store example schema, each with the field the selection walks through
const TYPES: [name: string, x: number, y: number, field: string, row: number][] = [
  ['Query', 0, 0, 'customer', 0],
  ['Customer', 34, 6, 'orders', 1],
  ['Order', 68, 18, 'total', 1],
];

/** an edge drawn in three steps from tick `from`, retracted on 26 */
function edge(from: number): Pose[] {
  return [
    [0, 'transform:scaleX(0)'],
    [from, 'transform:scaleX(0)', 3],
    [from + 3, 'transform:scaleX(1)'],
    [26, 'transform:scaleX(0)'],
  ];
}

const graphql = choreograph('graphql', 32, {
  hl0: { base: 'opacity:0', poses: show(0, 8) },
  hl1: { poses: show(8, 16) },
  hl2: { base: 'opacity:0', poses: show(16, 26) },
  edge1: { base: 'transform-origin:left', poses: edge(2) },
  edge2: { base: 'transform-origin:left', poses: edge(10) },
  // the type header lights as its edge arrives
  flash1: { base: 'opacity:0', poses: show(5, 6) },
  flash2: { base: 'opacity:0', poses: show(13, 14) },
});

/** the schema: a selection walks Query.customer to Customer.orders to Order.total */
export function GraphQLMechanism() {
  const c = graphql.cls;
  const hlCls = [c.hl0, c.hl1, c.hl2];
  let ink = '';
  const labels = [];
  for (let i = 0; i < TYPES.length; i++) {
    const [name, x, y, field, row] = TYPES[i];
    ink += frame(x, y, 28, 18) + rect(x, y, 28, 6) + rect(x + 2, y + 8 + 6 * (1 - row), 14, 1);
    labels.push(
      <Text key={name} x={x + 2} y={y + 0.9} className="bt-knock">
        {name}
      </Text>,
      <Text key={field} x={x + 2} y={y + 6.9 + 6 * row}>
        {field}
      </Text>,
      <Layer key={`hl-${field}`} className={`bt-on-hi ${hlCls[i]}`}>
        <Px hi={rect(x + 1, y + 6 + 6 * row, 26, 6)} />
        <Text x={x + 2} y={y + 6.9 + 6 * row}>
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
        <Text x={36} y={6.9}>
          Customer
        </Text>
      </Layer>
      <Layer className={c.flash2}>
        <Px paper={rect(69, 19, 26, 4)} />
        <Text x={70} y={18.9}>
          Order
        </Text>
      </Layer>
    </Stage>
  );
}
