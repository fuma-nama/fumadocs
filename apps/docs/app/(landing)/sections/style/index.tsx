import { copy } from '../../content';
import { Figure, FigureHeader } from '../../ui/figure';
import { FIRST, THEMES, type ThemeId } from './data';
import { createHardware } from './hardware';
import { loadInks, wire, type Wiring } from './presets';
import { FIRST_POSE, hangRopes } from './scene';
import { Stage } from './stage';

export async function Style() {
  const table = await loadInks();
  const overlay = table.tokens.indexOf('overlay');
  const names = table.tokens.filter((_, i) => i !== overlay);
  const wirings = {} as Record<ThemeId, { light: Wiring; dark: Wiring }>;
  for (const theme of THEMES) {
    const ink = table.inks[theme];
    wirings[theme] = {
      light: wire(ink.light.filter((_, i) => i !== overlay)),
      dark: wire(ink.dark.filter((_, i) => i !== overlay)),
    };
  }
  // the desk's cables in its first pose settle here, once: the browser takes their shape
  const ropes = hangRopes(FIRST_POSE);

  return (
    <Figure id="style" aria-label="Style" status={`layout: ${FIRST}`} className="pb-16">
      <FigureHeader
        lead={copy.style.lead}
        title={copy.style.title}
        description={copy.style.description}
        className="px-(--lp-gutter) pt-16 pb-10"
      />
      <Stage
        table={table}
        names={names}
        wirings={wirings}
        hung={{ x: Array.from(ropes.x), y: Array.from(ropes.y) }}
        hardware={createHardware()}
      />
    </Figure>
  );
}
