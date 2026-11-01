import { asMarkdown } from 'fumadocs-core/server';
import { copy } from '../../content';
import { Figure } from '../../ui/figure';
import { FigureHeader } from '../../ui/heading';
import { CORE, LAYERS, NAMES, OPTIONS, ROLES } from './data';
import { Stage } from './stage';

export function Parts() {
  if (asMarkdown())
    return (
      <>
        <FigureHeader title={copy.parts.title} />
        <ul>
          <li>
            Every page runs on these {LAYERS.length} layers, each a library of its own:
            <ul>
              {LAYERS.map((layer) => (
                <li key={layer}>
                  {NAMES[layer]}: {ROLES[layer]}
                  {layer === 'core' && ' (fixed)'}
                  <ul>
                    {(layer === 'core' ? [CORE] : OPTIONS[layer]).map((option) => (
                      <li key={option.title}>
                        {option.title} (<code>{option.name}</code>): {option.line}
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          </li>
        </ul>
      </>
    );

  return (
    <Figure id="parts" aria-label="Parts" status="4 layers">
      <Stage header={<FigureHeader title={copy.parts.title} />} />
    </Figure>
  );
}
