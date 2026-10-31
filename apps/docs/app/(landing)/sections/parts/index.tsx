import { copy } from '../../content';
import { Figure, FigureHeader } from '../../ui/figure';
import { Stage } from './stage';

export function Parts() {
  return (
    <Figure id="parts" aria-label="Parts" status="4 layers">
      <Stage header={<FigureHeader title={copy.parts.title} />} />
    </Figure>
  );
}
