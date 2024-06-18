export function createElement(
  name: string,
  props: object,
  ...child: string[]
): string {
  const s: string[] = [];
  const params = Object.entries(props)
    .map(([key, value]) => `${key}={${JSON.stringify(value)}}`)
    .join(' ');

  s.push(params.length > 0 ? `<${name} ${params}>` : `<${name}>`);
  s.push(...child.filter((v) => v.length > 0));
  s.push(`</${name}>`);

  return s.join('\n\n');
}

export function p(child?: string): string {
  if (!child) return '';
  return child.replace('<', '\\<').replace('>', '\\>');
}

export function span(child?: string): string {
  return `<span>${p(child)}</span>`;
}

interface CodeBlockProps {
  language: string;
  title?: string;
}

export function codeblock(
  { language, title }: CodeBlockProps,
  child: string,
): string {
  return [
    title
      ? `\`\`\`${language} title=${JSON.stringify(title)}`
      : `\`\`\`${language}`,
    child.trim(),
    '```',
  ].join('\n');
}
