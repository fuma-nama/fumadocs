/** the source the figure edits: a component's props, `color` deprecated by the edit */
export const FILE = 'button.tsx';
export const EDIT = '  /** @deprecated Use `className`. */';
export const SOURCE = `export interface ButtonProps {
  /** The text inside the button. */
  label: string;
  /** Renders a link instead. */
  href?: string;
${EDIT}
  color?: string;
  /** Called when it is pressed. */
  onPress?: () => void;
}`;

/** the source as it was before the edit, and the line the edit adds */
export const BEFORE = SOURCE.replace(`${EDIT}\n`, '');
export const EDIT_LINE = SOURCE.split('\n').indexOf(EDIT);

/** the page the source documents */
export const PAGE = { title: 'Button', description: 'A button, or a link with href.' };

/** the component's releases, newest first: the first ships the edit */
export const RELEASES = [
  { title: '2.0.0', description: 'Deprecates color, use className.' },
  { title: '1.2.0', description: 'Adds href, to render a link.' },
];

/**
 * What the source makes, in the order its thread reaches them, one clockwise loop round the desk:
 * each window, its title, and the status it reports as it pops.
 */
export const OUTPUTS = [
  { id: 'props', title: 'ButtonProps', status: 'generating ButtonProps' },
  { id: 'page', title: 'button.mdx', status: 'rendering button.mdx' },
  { id: 'og', title: 'og.png', status: 'drawing og.png' },
  { id: 'llms', title: 'llms.txt', status: 'writing llms.txt' },
  { id: 'releases', title: 'releases', status: 'reading releases' },
] as const;

export type Output = (typeof OUTPUTS)[number]['id'];
