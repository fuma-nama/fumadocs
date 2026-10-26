import { copy } from '../../content';
import { Figure, FigureHeader } from '../../ui/figure';
import { createPose, hangRopes, pose, SLOTS } from './board';
import { createHardware } from './hardware';
import { FIRST, THEMES, type ThemeId } from './data';
import { loadInks, wire, type Wiring } from './presets';
import { Studio } from './studio';

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
  const first = SLOTS.findIndex((slot) => slot.id === FIRST);
  const ropes = hangRopes(pose(first, createPose()));
  const hung = { x: Array.from(ropes.x), y: Array.from(ropes.y) };

  return (
    <Figure id="style" aria-label="Style" status={`layout: ${FIRST}`} className="pb-16">
      <FigureHeader
        lead={copy.style.lead}
        title={copy.style.title}
        description={copy.style.description}
        className="px-(--lp-gutter) pt-16 pb-10"
      />
      <Studio
        table={table}
        names={names}
        wirings={wirings}
        hung={hung}
        hardware={createHardware()}
      />
    </Figure>
  );
}
