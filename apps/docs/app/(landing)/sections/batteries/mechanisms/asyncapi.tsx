import { choreograph, cycle } from '../choreography';
import { art, frame, rect } from '../px';
import { Clip, Px, Stage, Strip } from '../stage';

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
    poses: [
      [0, 'transform:translateX(0)', 7],
      [7, 'transform:translateX(63px)'],
    ],
  },
  arcs: {
    ticks: 8,
    poses: [
      [0, 'opacity:1'],
      [2, 'opacity:0'],
    ],
  },
  message: cycle(7, 8, 4),
  protocol: cycle(5, 32, 3),
});

/** a channel: messages ride the pipe on beats, the subscriber lights up as each arrives */
export function AsyncAPIMechanism() {
  const c = asyncapi.cls;
  const messages = [];
  for (const message of MESSAGES) messages.push(<span className="bt-text">{message}</span>);
  const protocols = [];
  for (const protocol of PROTOCOLS) {
    protocols.push(<span className="bt-text w-full text-center">{protocol}</span>);
  }
  let pipe = rect(0, 15, 84, 1) + rect(0, 27, 84, 1);
  for (let x = 6; x < 84; x += 12) pipe += rect(x, 13, 1, 2) + rect(x, 28, 1, 2);
  let belt = '';
  for (let k = 0; k < 5; k++) belt += art(ENVELOPE, 7 + 24 * k, 0);

  return (
    <Stage c={asyncapi}>
      <Px ink={frame(0, 1, 20, 7)} />
      <Clip x={1} y={2} w={18} h={5}>
        <Strip items={protocols} h={5} loop className={c.protocol} />
      </Clip>
      <Clip x={23} y={1} w={58} h={7}>
        <Strip items={messages} h={7} loop className={c.message} />
      </Clip>
      <Px
        ink={
          pipe + frame(84, 11, 12, 21) + rect(89, 4, 2, 7) + rect(87, 15, 6, 5) + rect(88, 24, 4, 1)
        }
        knock={rect(84, 16, 1, 11)}
      />
      <Px orange={rect(88, 2, 4, 2)} className="bt-blink" />
      <Px orange={art(ARC_LEFT, 84, 1) + art(ARC_RIGHT, 93, 1)} className={c.arcs} />
      <Clip x={0} y={16} w={84} h={11}>
        <Px x={-24} y={2} w={120} h={7} orange={belt} className={c.belt} />
      </Clip>
    </Stage>
  );
}
