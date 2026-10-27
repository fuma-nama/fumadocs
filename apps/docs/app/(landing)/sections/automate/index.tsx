import { copy } from '../../content';
import { Corrected } from '../../ui/figure';
import { Press } from '../write';
import { blocks, button, steps } from './data';

export function Automate() {
  return (
    <Press
      id="automate"
      label="Automate"
      {...copy.automate}
      lead={<Corrected text={copy.automate.lead} was="out of" is="up to" />}
      file="button.mdx"
      entries={button.entries}
      sources={blocks}
      steps={steps}
    />
  );
}
