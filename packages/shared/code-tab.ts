import { and, listCode, type ListEntry } from './code-output';
import { groupLists, showElement } from './show';

export type CodeTabType = 'CodeBlockTabs' | 'Tabs';

const elements: Record<CodeTabType, { list: string; trigger: string; tab: string }> = {
  CodeBlockTabs: {
    list: 'CodeBlockTabsList',
    trigger: 'CodeBlockTabsTrigger',
    tab: 'CodeBlockTab',
  },
  Tabs: { list: 'TabsList', trigger: 'TabsTrigger', tab: 'TabsContent' },
};

interface CodeTab {
  value: string;
  /** the ID to persist the tab of its group with */
  group?: string;
  /** the meta of the code block without its tab */
  meta: string | undefined;
}

export interface CodeTabOptions<N> {
  /** the element of the tabs */
  type: CodeTabType;
  /** the code blocks are in the element of the tabs already */
  inElement?: boolean;
  tab: (node: N) => CodeTab | undefined;
  /** edit a node in place, so it stays the node that other plugins know */
  set: (node: N, key: 'meta' | 'children', value: unknown) => void;
  /** parse the title of a tab, without it `Tabs` lists its tabs in `items` */
  title?: (value: string) => N[];
  /** the value of an attribute from code */
  expression: (code: string) => object;
}

/**
 * Group the code blocks with a tab among sibling nodes into tabs. A tab is where its code blocks are, so the tab of a
 * code block in a branch shows with the branch.
 *
 * @returns the siblings, `undefined` without tabs
 */
export function groupCodeTabs<N extends { type: string; children?: N[] }>(
  children: N[],
  { type, inElement, tab, set, title, expression }: CodeTabOptions<N>,
): N[] | undefined {
  const names = elements[type];
  const asItems = type === 'Tabs' && !title;
  const attribute = (name: string, value: unknown) => ({ type: 'mdxJsxAttribute', name, value });
  const element = (name: string, attributes: object[], children: N[]) =>
    ({ type: 'mdxJsxFlowElement', name, attributes, children }) as unknown as N;

  return groupLists(
    children,
    (node) => tab(node) ?? false,
    (nodes, items) => {
      const codes = new Map<N, CodeTab>();
      /** the tabs in document order, with the code of the condition a tab shows on */
      const tabs = new Map<string, string | undefined>();
      for (const { node, data, when } of items) {
        codes.set(node, data);
        // a tab with a code block outside branches always shows
        const test = and(when);
        const other = tabs.get(data.value);
        tabs.set(data.value, tabs.has(data.value) ? other && test && `${other} || ${test}` : test);
      }

      /** the tabs of sibling nodes: a branch stays, with the tabs of the code blocks inside it */
      const content = (nodes: N[]): N[] => {
        const out: N[] = [];
        const tabs = new Map<string, N[]>();
        for (const node of nodes) {
          const code = codes.get(node);
          if (!code) {
            set(node, 'children', content(node.children!));
            out.push(node);
            continue;
          }
          let list = tabs.get(code.value);
          if (!list) {
            tabs.set(code.value, (list = []));
            out.push(element(asItems ? 'Tab' : names.tab, [attribute('value', code.value)], list));
          }
          set(node, 'meta', code.meta);
          list.push(node);
        }
        return out;
      };

      const out = content(nodes);
      if (!asItems) {
        const triggers: N[] = [];
        for (const [value, when] of tabs) {
          const trigger = element(
            names.trigger,
            [attribute('value', value)],
            title ? title(value) : [{ type: 'text', value } as unknown as N],
          );
          triggers.push(
            when ? element(showElement, [attribute('when', expression(when))], [trigger]) : trigger,
          );
        }
        out.unshift(element(names.list, [], triggers));
      }
      if (inElement) return out;

      const attributes: object[] = [];
      const list: ListEntry[] = [];
      let conditional = false;
      for (const [name, when] of tabs) {
        list.push({ code: JSON.stringify(name), when: when ? [when] : [] });
        if (when) conditional = true;
      }
      /** the code of the tabs that show */
      const shown = listCode(list, true);
      // tabs keep the selected tab while mounted, a page can render again with other props: they start over then
      if (conditional) attributes.push(attribute('key', expression(`${shown}.join()`)));
      if (asItems) attributes.push(attribute('items', expression(shown)));
      else {
        const [[first, when]] = tabs;
        attributes.push(attribute('defaultValue', when ? expression(`${shown}[0]`) : first));
      }
      const { group } = items[0].data;
      if (type === 'CodeBlockTabs' && group)
        attributes.push(attribute('groupId', group), attribute('persist', null));
      return [element(type, attributes, out)];
    },
    (branch, children) => set(branch, 'children', children),
  );
}
