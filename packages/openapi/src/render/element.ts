function create(name: string, props: object, ...child: string[]): string[] {
  const s: string[] = [];
  const params = Object.entries(props)
    .map(([key, value]) => `${key}={${JSON.stringify(value)}}`)
    .join(' ');

  s.push(params.length > 0 ? `<${name} ${params}>` : `<${name}>`);
  s.push(...child);
  s.push(`</${name}>`);

  return s;
}

export function createElement(
  name: string,
  props: object,
  ...child: string[]
): string {
  return create(name, props, ...child).join('\n\n');
}

export function p(child?: string): string {
  if (!child) return '';
  return child.replace('<', '\\<').replace('>', '\\>');
}

export function span(child?: string): string {
  return `<span>${p(child)}</span>`;
}
