import { copy } from '../../content';
import { Figure, FigureHeader } from '../../ui/figure';
import { Customize } from './customize';
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

  return (
    <Figure n={4} id="style" aria-label="Style" status="layout: docs">
      <FigureHeader
        lead={copy.style.lead}
        title={copy.style.title}
        description={copy.style.description}
        className="px-(--lp-gutter) pt-16 pb-10"
      />
      <Studio table={table} names={names} wirings={wirings} />
      <div className="mt-16 border-t border-lp-line pt-12 pb-16">
        <Customize />
      </div>
    </Figure>
  );
}
