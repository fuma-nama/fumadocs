import { choreograph, type Pose, up } from '../choreography';
import { rect } from '../px';
import { Clip, Layer, Px, Stage, Strip } from '../stage';

// `On this page` of the table of contents in @fumadocs/language
const LOCALES = ['en', 'zh-cn', 'zh-tw'];
const LABELS = ['On this page', '本页目录', '本頁目錄'];

/** the poses of each flip, on ticks 0, 16 and 32 of the 48-tick loop */
function flips(at: (tick: number) => Pose[]): Pose[] {
  const poses: Pose[] = [[0, 'transform:scaleY(0)']];
  for (let t = 0; t < 48; t += 16) poses.push(...at(t));
  return poses;
}

// rows of a face are 17 cells: the top flap folds down over 2 ticks, the bottom one lands on 3
const i18n = choreograph('i18n', 48, {
  now: {
    poses: [
      [0, up(0)],
      [16, up(17)],
      [32, up(34)],
    ],
  },
  prev: {
    poses: [
      [0, up(34)],
      [16, up(0)],
      [32, up(17)],
    ],
  },
  bottom: {
    poses: [
      [0, up(34)],
      [3, up(0)],
      [19, up(17)],
      [35, up(34)],
    ],
  },
  fallTop: {
    base: 'transform-origin:50% 100%;transform:scaleY(0)',
    poses: flips((t) => [
      [t, 'transform:scaleY(1)'],
      [t + 1, 'transform:scaleY(0.5)'],
      [t + 2, 'transform:scaleY(0)'],
    ]),
  },
  fallBottom: {
    base: 'transform-origin:50% 0;transform:scaleY(0)',
    poses: flips((t) => [
      [t + 2, 'transform:scaleY(0.5)'],
      [t + 3, 'transform:scaleY(1)'],
      [t + 4, 'transform:scaleY(0)'],
    ]),
  },
});

// a face is 51px: two 25px halves around a 1px cut
const HALF = 25 / 3;
const LOW = 26 / 3;

/** a split-flap unit, 17 cells tall; static halves under the falling flaps */
function Flap({ x, y, w, values }: { x: number; y: number; w: number; values: readonly string[] }) {
  const c = i18n.cls;
  const faces = [];
  for (const value of values) faces.push(<span className="bt-flap-face">{value}</span>);
  return (
    <>
      <Px x={x} y={y} w={w} h={17} ink={rect(0, 0, w, 17)} />
      <Clip x={x} y={y} w={w} h={HALF}>
        <Strip items={faces} h={17} className={c.now} />
      </Clip>
      <Clip x={x} y={y + LOW} w={w} h={HALF}>
        <Strip items={faces} h={17} className={`bt-flap-low ${c.bottom}`} />
      </Clip>
      <Clip x={x} y={y} w={w} h={HALF} className={c.fallTop}>
        <Strip items={faces} h={17} className={c.prev} />
      </Clip>
      <Clip x={x} y={y + LOW} w={w} h={HALF} className={c.fallBottom}>
        <Strip items={faces} h={17} className={`bt-flap-low ${c.now}`} />
      </Clip>
      <Px x={x} y={y} w={w} h={17} knock={rect(0, 8, 1, 1) + rect(w - 1, 8, 1, 1)} />
    </>
  );
}

/** a split-flap display: the locale and the translated `On this page` flip together */
export function I18nMechanism() {
  return (
    <Stage c={i18n}>
      <Flap x={0} y={3} w={32} values={LOCALES} />
      <Layer className="bt-lag">
        <Flap x={0} y={22} w={96} values={LABELS} />
      </Layer>
    </Stage>
  );
}
