import plugin from 'tailwindcss/plugin';

export interface DocsUIOptions {
  /**
   * Prefix to the variable name of colors
   *
   * @defaultValue 'fd'
   */
  cssPrefix?: string;

  /**
   * Add Fumadocs UI `fd-*` colors to global colors
   *
   * @defaultValue false
   */
  addGlobalColors?: boolean;

  /**
   * Max width of docs layout
   *
   * @defaultValue '100vw'
   */
  layoutWidth?: string;

  // TODO: disable by default at next major/minor
  /**
   * Add Fumadocs UI `fd-*` utilities without prefixes
   *
   * @defaultValue true
   */
  addGlobalUtils?: boolean;
}

type CSSRules = {
  [key: string]: CSSRules | string;
};

function createTailwindUtilities(prefix: string): CSSRules {
  const append = prefix.length > 0 ? prefix + '-' : prefix;

  return {
    [`.${append}steps`]: {
      'counter-reset': 'step',
      'border-left-width': '1px',
      'margin-left': '1rem',
      'padding-left': '1.75rem',
      position: 'relative',
    },
    [`.${append}step:before`]: {
      'background-color': 'var(--color-fd-secondary)',
      color: 'var(--color-fd-secondary-foreground)',
      content: 'counter(step)',
      'counter-increment': 'step',
      'border-radius': `theme('borderRadius.full')`,
      'justify-content': 'center',
      'align-items': 'center',
      width: '2rem',
      height: '2rem',
      'font-size': '.875rem',
      'line-height': '1.25rem',
      display: 'flex',
      position: 'absolute',
      left: '-1rem',
    },
    '.prose-no-margin': {
      '& > :first-child': {
        marginTop: '0',
      },
      '& > :last-child': {
        marginBottom: '0',
      },
    },
  };
}

export const docsUi: unknown = plugin.withOptions<DocsUIOptions>(
  ({ layoutWidth = '100vw', addGlobalUtils = true } = {}) => {
    return ({ addBase, addUtilities }) => {
      addBase({
        ':root': {
          '--fd-sidebar-width': '0px',
          '--fd-toc-width': '0px',
          '--fd-layout-width': layoutWidth,
          '--fd-banner-height': '0px',
          '--fd-nav-height': '0px',
          '--fd-tocnav-height': '0px',

          '--fd-diff-remove-color': 'rgba(200,10,100,0.12)',
          '--fd-diff-remove-symbol-color': 'rgb(230,10,100)',
          '--fd-diff-add-color': 'rgba(14,180,100,0.12)',
          '--fd-diff-add-symbol-color': 'rgb(10,200,100)',
        },
      });

      if (addGlobalUtils) {
        // @ts-expect-error -- buggy Tailwind CSS types
        addUtilities(createTailwindUtilities(''));
      }

      // @ts-expect-error -- buggy Tailwind CSS types
      addUtilities(createTailwindUtilities('fd'));
    };
  },
);

export default docsUi;
