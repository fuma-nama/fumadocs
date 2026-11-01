import { asMarkdown } from 'fumadocs-core/server';
import { copy } from '../../content';
import { block, heading } from '../../markdown';
import { Figure, FigureHeader } from '../../ui/figure';
import { CORE, LAYERS, NAMES, OPTIONS, ROLES } from './data';
import { Stage } from './stage';

export function Parts() {
  if (asMarkdown()) {
    const lines = [
      `- Every page runs on these ${LAYERS.length} layers, each a library of its own:`,
    ];
    for (const layer of LAYERS) {
      lines.push(`  - ${NAMES[layer]}: ${ROLES[layer]}${layer === 'core' ? ' (fixed)' : ''}`);
      for (const option of layer === 'core' ? [CORE] : OPTIONS[layer])
        lines.push(`    - ${option.title} (\`${option.name}\`): ${option.line}`);
    }
    return block`
      ${heading(copy.parts)}

      ${lines.join('\n')}
    `;
  }

  return (
    <Figure id="parts" aria-label="Parts" status="4 layers">
      <Stage header={<FigureHeader title={copy.parts.title} />} />
    </Figure>
  );
}
