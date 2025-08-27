import type { MdxJsxAttribute, MdxJsxFlowElement } from 'mdast-util-mdx-jsx';
import type { BlockContent, Text } from 'mdast';

export interface CodeBlockTabsOptions {
  attributes?: MdxJsxAttribute[];
  defaultValue?: string;
  persist?:
    | {
        id: string;
      }
    | false;
  triggers: {
    value: string;
    children: (BlockContent | Text)[];
  }[];
  tabs: {
    value: string;
    children: BlockContent[];
  }[];
}

export function generateCodeBlockTabs({
  persist = false,
  defaultValue,
  triggers,
  tabs,
  ...options
}: CodeBlockTabsOptions): MdxJsxFlowElement {
  const attributes: MdxJsxAttribute[] = [];
  if (options.attributes) attributes.push(...options.attributes);

  if (defaultValue) {
    attributes.push({
      type: 'mdxJsxAttribute',
      name: 'defaultValue',
      value: defaultValue,
    });
  }

  if (typeof persist === 'object') {
    attributes.push(
      {
        type: 'mdxJsxAttribute',
        name: 'groupId',
        value: persist.id,
      },
      {
        type: 'mdxJsxAttribute',
        name: 'persist',
        value: null,
      },
    );
  }

  const children: MdxJsxFlowElement[] = [
    {
      type: 'mdxJsxFlowElement',
      name: 'CodeBlockTabsList',
      attributes: [],
      children: triggers.map(
        (trigger) =>
          ({
            type: 'mdxJsxFlowElement',
            attributes: [
              { type: 'mdxJsxAttribute', name: 'value', value: trigger.value },
            ],
            name: 'CodeBlockTabsTrigger',
            children: trigger.children,
          }) as MdxJsxFlowElement,
      ),
    },
  ];

  for (const tab of tabs) {
    children.push({
      type: 'mdxJsxFlowElement',
      name: 'CodeBlockTab',
      attributes: [
        { type: 'mdxJsxAttribute', name: 'value', value: tab.value },
      ],
      children: tab.children,
    });
  }

  return {
    type: 'mdxJsxFlowElement',
    name: 'CodeBlockTabs',
    attributes,
    children,
  };
}

export interface CodeBlockAttributes<Name extends string = string> {
  attributes: Partial<Record<Name, string>>;
  rest: string;
}

/**
 * Parse Fumadocs-style code block attributes from meta string, like `title="hello world"`
 */
export function parseCodeBlockAttributes<Name extends string = string>(
  meta: string,
  allowedNames?: Name[],
): CodeBlockAttributes<Name> {
  let str = meta;
  const StringRegex = /(?<=^|\s)(?<name>\w+)=(?:"([^"]*)"|'([^']*)')/g;
  const attributes: Partial<Record<Name, string>> = {};

  str = str.replaceAll(StringRegex, (match, name, value_1, value_2) => {
    if (allowedNames && !allowedNames.includes(name)) return match;

    attributes[name as Name] = value_1 ?? value_2;
    return '';
  });

  return {
    rest: str,
    attributes,
  };
}
