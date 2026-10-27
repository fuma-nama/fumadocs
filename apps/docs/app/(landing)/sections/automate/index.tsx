import { copy } from '../../content';
import { Status } from '../../ui/figure';
import { Press } from '../write';
import { blocks, button, steps } from './data';

export function Automate() {
  return (
    <Press
      id="automate"
      label="Automate"
      {...copy.automate}
      lead={<Status>{copy.automate.lead}</Status>}
      file="button.mdx"
      entries={button.entries}
      sources={blocks}
      steps={steps}
    />
  );
}
