import type {
  AttributeInterface,
  ClassInterface,
  DocstringSection,
  FunctionInterface,
  ModuleInterface,
  ParameterInterface,
} from '@/generated';

export type OutputFile = {
  path: string;
  frontmatter: Record<string, unknown>;
  content: string;
};

export interface ConvertOptions {
  baseUrl?: string;
}

export function convert(
  mod: ModuleInterface,
  options: ConvertOptions = {},
): OutputFile[] {
  const files: OutputFile[] = [];
  const content: string[] = [];
  const tabs: string[] = [];
  const tabContents: string[] = [];

  if (mod.description) content.push(encodeText(mod.description));
  for (const attr of mod.attributes) {
    content.push(convertAttribute(attr));
  }

  if (Object.keys(mod.classes).length > 0) {
    tabs.push('Class');
    const lines: string[] = [];
    for (const cls of Object.values(mod.classes)) {
      files.push(...convertClass(cls));

      lines.push(
        element('Card', {
          title: cls.name,
          href: getHref(cls, options),
        }),
      );
    }

    tabContents.push(element('Cards', undefined, lines.join('\n')));
  }

  if (Object.keys(mod.functions).length > 0) {
    tabs.push('Functions');
    const lines: string[] = [];
    for (const func of Object.values(mod.functions)) {
      lines.push(convertFunction(func));
    }
    tabContents.push(lines.join('\n'));
  }

  if (Object.keys(mod.modules).length > 0) {
    tabs.push('Modules');
    const lines: string[] = [];
    for (const submod of Object.values(mod.modules)) {
      files.push(...convert(submod, options));

      lines.push(
        element('Card', {
          href: getHref(submod, options),
          title: submod.name,
        }),
      );
    }
    tabContents.push(element('Cards', undefined, lines.join('\n')));
  }

  if (tabs.length > 0) {
    content.push(
      element(
        'Tabs',
        {
          items: tabs,
        },
        tabContents
          .map((content, i) => element('Tab', { value: tabs[i] }, content))
          .join('\n'),
      ),
    );
  }

  files.push({
    path: [...mod.path.split('.'), 'index.mdx'].join('/'),
    frontmatter: {
      title: mod.name,
    },
    content: content.join('\n\n'),
  });

  return files;
}

function convertClass(cls: ClassInterface): OutputFile[] {
  const content: string[] = [];
  const files: OutputFile[] = [];

  if (cls.description) content.push(encodeText(cls.description));

  if (cls.attributes.length > 0) {
    content.push(heading(2, 'Attributes'));
  }

  for (const attr of cls.attributes) {
    content.push(convertAttribute(attr));
  }

  if (Object.keys(cls.functions).length > 0) {
    content.push(heading(2, 'Functions'));

    for (const func of Object.values(cls.functions)) {
      content.push(convertFunction(func));
    }
  }

  files.push({
    path: cls.path.replaceAll('.', '/') + '.mdx',
    frontmatter: {
      title: cls.name,
    },
    content: content.join('\n\n'),
  });
  return files;
}

function convertFunction(func: FunctionInterface) {
  return element(
    'PyFunction',
    {
      name: func.name,
      type: func.signature,
    },
    [
      func.description ? encodeText(func.description) : null,
      convertDoc(func.docstring ?? []),
      func.source.length > 0
        ? element('PySourceCode', undefined, codeblock('python', func.source))
        : null,
      func.parameters.length > 0
        ? element(
            'div',
            undefined,
            func.parameters.map(convertParameter).join('\n'),
          )
        : null,
      element(
        'PyFunctionReturn',
        {
          type: func.returns.annotation,
        },
        [func.returns.description ? encodeText(func.returns.description) : null]
          .filter(Boolean)
          .join('\n'),
      ),
    ]
      .filter(Boolean)
      .join('\n\n'),
  );
}

function convertParameter(param: ParameterInterface) {
  const lines: string[] = [];
  if (param.description)
    lines.push(
      typeof param.description === 'string'
        ? param.description
        : convertDoc(param.description),
    );

  return element(
    'PyParameter',
    { name: param.name, type: param.annotation, value: param.value },
    lines.join('\n'),
  );
}

function convertAttribute(attribute: AttributeInterface) {
  return element(
    'PyAttribute',
    {
      name: attribute.name,
      type: attribute.annotation,
      value: attribute.value,
    },
    [attribute.description ? convertDoc(attribute.description) : null]
      .filter(Boolean)
      .join('\n'),
  );
}

function convertDoc(docstring: DocstringSection[]) {
  const lines: string[] = [];
  for (const item of docstring) {
    if (item.kind === 'text') {
      lines.push(encodeText(item.value as string));
    }

    if (item.kind === 'admonition') {
      const value = item.value as { annotation: string; description: string };
      lines.push(
        element(
          'Callout',
          {
            title: item.title,
            type: value.annotation,
          },
          encodeText(item.value.description),
        ),
      );
    }
    if (item.kind === 'code') {
      console.log(item.value);
    }
  }

  return lines.join('\n\n');
}

function heading(depth: number, content: string) {
  return ['#'.repeat(depth), content].join(' ');
}

function codeblock(meta: string, code: string) {
  const delimit = '```';
  return `${delimit}${meta}\n${code.replaceAll(delimit, '\\' + delimit)}\n${delimit}`;
}

function element(
  name: string,
  props: Record<string, unknown> = {},
  children?: string,
) {
  const propsStr: string[] = [];
  for (const key in props) {
    propsStr.push(`${key}={${JSON.stringify(props[key])}}`);
  }

  if (children)
    return `<${name} ${propsStr.join(' ')}>

${children}

</${name}>`;

  return `<${name} ${propsStr.join(' ')} />`;
}

function getHref(
  ele: ModuleInterface | FunctionInterface | ClassInterface,
  options: ConvertOptions,
) {
  const { baseUrl = '/' } = options;

  return (
    '/' +
    [...baseUrl.split('/'), ...ele.path.split('.')]
      .filter((v) => v.length > 0)
      .join('/')
  );
}

function encodeText(v: string) {
  return v.replaceAll('<', '\\<').replaceAll('{', '\\{').replaceAll('}', '\\}');
}
