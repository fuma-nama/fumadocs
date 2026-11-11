import { groupLists, showCondition } from './show';

interface StepNode {
  type: string;
  children?: StepNode[];
  depth?: number;
  value?: string;
  data?: object | null;
}

/** the properties of the element of a node */
function properties(node: StepNode): Record<string, unknown> | undefined {
  return (node.data as { hProperties?: Record<string, unknown> } | null | undefined)?.hProperties;
}

export interface StepsOptions<N> {
  /** the class names of a list of steps, and of a step */
  steps: string;
  step: string;
  /** edit a node in place, so it stays the node that other plugins know */
  set: (node: N, key: 'value' | 'data' | 'children', value: unknown) => void;
  /** replace the Markdown of a node in search records */
  searchSource: (node: N, text: (source: string) => string) => void;
}

const StepRegex = /^(\d+)\.\s(.+)$/;
const StepTag = '[step]';

function removeTag(text: string): string {
  const idx = text.indexOf(StepTag);
  return idx === -1 ? text : text.slice(0, idx).trimEnd() + text.slice(idx + StepTag.length);
}

interface Step<N> {
  text: N;
  value: string;
  tag: boolean;
}

/**
 * Read a heading as a step, `1. Title` or `Title [step]`: its text with the syntax of the step, and the text without
 * it.
 */
export function readStep<N extends StepNode & { children?: N[] }>(heading: N): Step<N> | undefined {
  const content = heading.children!;
  const head = content[0];
  const match = head?.type === 'text' && StepRegex.exec(head.value!);
  if (match) return { text: head, value: match[2], tag: false };

  const tail = content[content.length - 1];
  if (tail?.type === 'text' && tail.value!.includes(StepTag))
    return { text: tail, value: removeTag(tail.value!), tag: true };
}

/**
 * Group the steps among sibling nodes: headings like `1. Title` or `Title [step]`. Each step is wrapped with its
 * content, a heading of another kind at their level or above ends the list.
 *
 * @returns the siblings, `undefined` without steps
 */
export function groupSteps<N extends StepNode & { children?: N[] }>(
  children: N[],
  options: StepsOptions<N>,
): N[] | undefined {
  const { steps, step, set, searchSource } = options;
  const div = (className: string, children: N[]) =>
    ({
      type: 'mdxJsxFlowElement',
      name: 'div',
      attributes: [{ type: 'mdxJsxAttribute', name: 'className', value: className }],
      children,
    }) as unknown as N;

  return groupLists<N, Step<N>>(
    children,
    (node, first) => {
      if (node.type !== 'heading' || properties(node)?.['data-fd-step'] !== undefined) return;
      if (first && node.depth !== first.depth)
        return node.depth! < first.depth! ? false : undefined;
      return readStep(node) ?? false;
    },
    (nodes, items) => {
      const headings = new Set<N>();
      for (const { node, data } of items) {
        set(data.text, 'value', data.value);
        // the Markdown keeps the tag, search records don't
        if (data.tag) searchSource(data.text, removeTag);
        set(node, 'data', {
          ...node.data,
          hProperties: { ...properties(node), 'data-fd-step': headings.add(node).size },
        });
      }

      /** the steps: their heading, then their content */
      const wrapped: N[][] = [];
      /** wrap each step of the nodes with its content, the nodes before the first step stay */
      const wrap = (nodes: N[]): N[] => {
        const out: N[] = [];
        let current: N[] | undefined;
        for (const node of nodes) {
          const count = wrapped.length;
          const inner = showCondition(node) ? wrap(node.children!) : undefined;
          if (headings.has(node)) {
            wrapped.push((current = [node]));
            out.push(div(step, current));
          } else if (wrapped.length > count) {
            // a branch with steps isn't in a step
            current = undefined;
            set(node, 'children', inner);
            out.push(node);
          } else if (current) current.push(node);
          else out.push(node);
        }
        return out;
      };
      const list = div(steps, wrap(nodes));
      // the lists inside a step: not every tree visits the nodes built here
      for (const content of wrapped) {
        const inner = groupSteps(content.slice(1), options);
        if (inner) content.splice(1, content.length, ...inner);
      }
      return [list];
    },
    (branch, children) => set(branch, 'children', children),
  );
}

/**
 * Number the steps of a list output that is read in document order, like the TOC: a variable of each list of steps
 * counts its steps that show. A list can be inside a step of another list.
 */
export function stepNumberCode() {
  /** the lists a step can go on: the depth of their headings and the number of their last step */
  const open: { depth: number; last: number; name: string }[] = [];
  let lists = 0;
  let declaration = '';
  return {
    /** the code that declares the variables */
    get declaration() {
      return declaration;
    },
    /**
     * The code of the number of a step, every step of a list is given in document order.
     *
     * @param step - its number among the steps of its list
     */
    next(step: number, depth: number): string {
      let list = open[open.length - 1];
      while (step > 1 && list && (list.depth !== depth || list.last !== step - 1)) {
        open.pop();
        list = open[open.length - 1];
      }
      if (step === 1 || !list) {
        open.push((list = { depth, last: step, name: `_step${++lists}` }));
        declaration += `let ${list.name} = ${step - 1};\n`;
      }
      list.last = step;
      return `++${list.name}`;
    },
  };
}
