import { copy } from '../../content';
import { Figure, FigureHeader } from '../../ui/figure';
import { createPose, hangRopes, pose, SLOTS } from './board';
import { THEMES, type ThemeId } from './data';
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

  // the desk's cables in its first pose (docs, where the studio starts) settle here, once: the
  // browser takes their shape
  const first = SLOTS.findIndex((slot) => slot.id === 'docs');
  const ropes = hangRopes(pose(first, -1, createPose()));
  const hung = { x: Array.from(ropes.x), y: Array.from(ropes.y) };

  return (
    <Figure n={4} id="style" aria-label="Style" status="layout: docs" className="pb-16">
      <FigureHeader
        lead={copy.style.lead}
        title={copy.style.title}
        description={copy.style.description}
        className="px-(--lp-gutter) pt-16 pb-10"
      />
      <Studio table={table} names={names} wirings={wirings} hung={hung} />
    </Figure>
  );
}
