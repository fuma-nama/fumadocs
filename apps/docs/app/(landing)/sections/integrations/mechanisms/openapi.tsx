import { choreograph, cycle, pop, show } from '../choreography';
import { art, dashes, frame, rect } from '../px';
import { PLAY } from '../sprites';
import { Clip, Layer, Px, Stage, Strip, Text } from '../stage';

// operations of the Scalar Galaxy example spec and their success codes
const METHODS = ['GET', 'POST', 'GET', 'DELETE'];
const PATHS = ['/planets', '/planets', '/planets/{planetId}', '/planets/{planetId}'];
const CODES = ['200', '201', '200', '204'];

const openapi = choreograph('openapi', 32, {
  // one operation per loop
  operation: cycle(7, 32, 4),
  press: { base: 'opacity:0', poses: show(2, 3) },
  out: {
    base: 'opacity:0',
    poses: [
      [3, 'opacity:1;transform:translateX(0)', 8],
      [11, 'opacity:1;transform:translateX(144px)'],
      [12, 'opacity:0'],
    ],
  },
  back: {
    base: 'opacity:0',
    poses: [
      [15, 'opacity:1;transform:translateX(0)', 8],
      [23, 'opacity:1;transform:translateX(-135px)'],
      [24, 'opacity:0'],
    ],
  },
  ledA: {
    base: 'opacity:0',
    poses: [
      [11, 'opacity:1'],
      [12, 'opacity:0'],
      [13, 'opacity:1'],
      [14, 'opacity:0'],
      [15, 'opacity:1'],
      [16, 'opacity:0'],
    ],
  },
  ledB: {
    base: 'opacity:0',
    poses: [
      [12, 'opacity:1'],
      [13, 'opacity:0'],
      [14, 'opacity:1'],
      [15, 'opacity:0'],
    ],
  },
  status: { poses: pop(23, 30) },
  line0: { poses: pop(24, 30) },
  line1: { poses: pop(25, 30) },
  line2: { poses: pop(26, 30) },
});

/** the playground: Send, a packet runs to the server and back with the status code */
export function OpenAPIMechanism() {
  const c = openapi.cls;
  const badges = [];
  const paths = [];
  const codes = [];
  for (let i = 0; i < METHODS.length; i++) {
    badges.push(<span className="bt-badge">{METHODS[i]}</span>);
    paths.push(<span className="bt-text">{PATHS[i]}</span>);
    codes.push(<span className="bt-text bt-orange-text">{CODES[i]}</span>);
  }
  let server = frame(72, 8, 24, 24) + rect(75, 32, 4, 2) + rect(89, 32, 4, 2);
  for (let k = 0; k < 3; k++) {
    server += frame(74, 10 + 7 * k, 13, 5) + rect(76, 12 + 7 * k, 9, 1);
    server += rect(89, 11 + 7 * k, 2, 2) + rect(92, 11 + 7 * k, 2, 2);
  }

  return (
    <Stage c={openapi}>
      <Clip x={0} y={0} w={18} h={7}>
        <Strip items={badges} h={7} loop className={c.operation} />
      </Clip>
      <Clip x={20} y={0} w={76} h={7}>
        <Strip items={paths} h={7} loop className={c.operation} />
      </Clip>
      <Px ink={frame(0, 10, 22, 9) + art(PLAY, 3, 12) + dashes(23, 14, 49, 1, 2) + server} />
      <Text x={8} y={11.9}>
        Send
      </Text>
      <Layer className={c.press}>
        <Px ink={rect(0, 10, 22, 9)} knock={art(PLAY, 3, 12)} />
        <Text x={8} y={11.9} className="bt-knock">
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
      <Px orange={rect(92, 25, 2, 2)} className="bt-blink" />
      <Clip x={0} y={22} w={12} h={7} className={c.status}>
        <Strip items={codes} h={7} loop className={c.operation} />
      </Clip>
      <Px ink={rect(0, 31, 30, 1)} className={c.line0} />
      <Px ink={rect(3, 34, 42, 1)} className={c.line1} />
      <Px ink={rect(3, 37, 26, 1)} className={c.line2} />
    </Stage>
  );
}
