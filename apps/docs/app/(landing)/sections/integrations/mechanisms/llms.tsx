import { choreograph, pop } from '../choreography';
import { art, dither, frame, rect } from '../px';
import { PLAY } from '../sprites';
import { Layer, Px, Stage, Text } from '../stage';

// the beam reads the page block by block, each block prints its Markdown line
const llms = choreograph('llms', 32, {
  beam: {
    base: 'opacity:0',
    poses: [
      [1, 'opacity:1;transform:translateY(0)'],
      [4, 'transform:translateY(12px)'],
      [7, 'transform:translateY(24px)'],
      [10, 'transform:translateY(36px)'],
      [13, 'transform:translateY(54px)'],
      [17, 'opacity:0'],
    ],
  },
  title: { poses: pop(2, 28) },
  description: { poses: pop(5, 28) },
  heading: { poses: pop(8, 28) },
  paragraph: { poses: pop(11, 28) },
  fence: { poses: pop(14, 28) },
  code: { poses: pop(15, 28) },
  close: { poses: pop(16, 28) },
});

/** a page is read block by block and printed as the Markdown served to AI agents */
export function LLMsMechanism() {
  const c = llms.cls;
  return (
    <Stage c={llms}>
      <Px
        ink={
          frame(0, 4, 26, 35) +
          rect(3, 7, 14, 2) +
          dither(3, 11, 20, 1, 10) +
          rect(3, 15, 10, 2) +
          rect(3, 19, 20, 1) +
          rect(3, 21, 15, 1) +
          rect(3, 25, 20, 9) +
          frame(34, 4, 62, 35)
        }
        knock={rect(5, 27, 10, 1) + rect(5, 29, 14, 1) + rect(5, 31, 8, 1)}
        orange={art(PLAY, 28, 19)}
      />
      <Text x={34} y={0.4} className="bt-code bt-dim">
        /docs/markdown/twoslash.md
      </Text>
      <Px x={1} y={7} w={24} h={1} orange={rect(0, 0, 24, 1)} className={c.beam} />
      <Layer className={c.title}>
        <Text x={37} y={6.9} className="bt-code">
          #
        </Text>
        <Px ink={rect(41, 8, 22, 1)} />
      </Layer>
      <Px ink={rect(37, 12, 40, 1)} className={c.description} />
      <Layer className={c.heading}>
        <Text x={37} y={14.9} className="bt-code">
          ##
        </Text>
        <Px ink={rect(43, 16, 12, 1)} />
      </Layer>
      <Px ink={rect(37, 20, 50, 1) + rect(37, 22, 36, 1)} className={c.paragraph} />
      <Text x={37} y={24.9} className={`bt-code ${c.fence}`}>
        ```ts
      </Text>
      <Px ink={rect(39, 30, 30, 1)} className={c.code} />
      <Text x={37} y={32.9} className={`bt-code ${c.close}`}>
        ```
      </Text>
    </Stage>
  );
}
