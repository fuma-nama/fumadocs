import { copy } from '../../content';
import { Regenerate } from '../../ui/text';
import { Press } from '../write';
import { blocks, button, steps } from './data';

export function Automate() {
  return (
    <Press
      id="automate"
      label="Automate"
      {...copy.automate}
      lead={<Regenerate text={copy.automate.lead} />}
      file="button.mdx"
      entries={button.entries}
      sources={blocks}
      steps={steps}
    />
  );
}
