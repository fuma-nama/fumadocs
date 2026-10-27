import { copy } from '../../content';
import { Press } from '../write';
import { blocks, button, steps } from './data';

export function Automate() {
  return (
    <Press
      id="automate"
      label="Automate"
      {...copy.automate}
      file="button.mdx"
      entries={button.entries}
      sources={blocks}
      steps={steps}
    />
  );
}
