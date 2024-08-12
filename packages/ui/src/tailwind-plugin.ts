import typography from '@tailwindcss/typography';
import plugin from 'tailwindcss/plugin';
import type { CSSRuleObject, PresetsConfig } from 'tailwindcss/types/config';
import { presets } from './theme/colors';
import { animations } from './theme/animations';
import { typography as typographyConfig } from './theme/typography';

interface DocsUIOptions {
  /**
   * Prefix to the variable name of colors
   *
   * @defaultValue ''
   */
  cssPrefix?: string;

  /**
   * Add Fumadocs UI `fd-*` colors to global colors
   *
   * @defaultValue false
   */
  addGlobalColors?: boolean;

  /**
   * Change the default styles of `container`
   *
   * @defaultValue true
   */
  modifyContainer?: boolean;

  /**
   * Max width of docs layout
   *
   * @defaultValue '100vw'
   */
  layoutWidth?: string;

  /**
   * Color preset
   */
  preset?: keyof typeof presets | Preset;
}

type Keys =
  | 'background'
  | 'foreground'
  | 'muted'
  | 'muted-foreground'
  | 'popover'
  | 'popover-foreground'
  | 'card'
  | 'card-foreground'
  | 'border'
  | 'primary'
  | 'primary-foreground'
  | 'secondary'
  | 'secondary-foreground'
  | 'accent'
  | 'accent-foreground'
  | 'ring';

type Theme = Record<Keys, string>;

export interface Preset {
  light: Theme;
  dark: Theme;
  css?: CSSRuleObject;
}

function getThemeStyles(prefix: string, theme: Theme): Record<string, string> {
  return Object.fromEntries(
    Object.entries(theme).map(([k, v]) => [variableName(prefix, k), v]),
  );
}

function variableName(prefix: string, name: string): string {
  return `--${[prefix, name].filter(Boolean).join('-')}`;
}

type TailwindColors = Record<string, string | Record<string, string>>;

function createTailwindColors(
  prefix: string,
  cloneToGlobal: boolean,
): TailwindColors {
  function colorToCSS(name: Keys): string {
    return `hsl(var(${variableName(prefix, name)}) / <alpha-value>)`;
  }

  const v = new Map<string, TailwindColors[string]>();

  for (const key of ['background', 'foreground', 'ring', 'border'] as const) {
    const value = colorToCSS(key);
    v.set(`fd-${key}`, value);
    if (cloneToGlobal) v.set(key, value);
  }

  for (const key of [
    'popover',
    'primary',
    'secondary',
    'accent',
    'muted',
    'card',
  ] as const) {
    const value = {
      DEFAULT: colorToCSS(key),
      foreground: colorToCSS(`${key}-foreground`),
    };

    v.set(`fd-${key}`, value);
    if (cloneToGlobal) v.set(key, value);
  }

  return Object.fromEntries(v.entries());
}

export const docsUi = plugin.withOptions<DocsUIOptions>(
  ({ cssPrefix = '', preset = 'default', layoutWidth = '100vw' } = {}) => {
    return ({ addBase, addComponents, addUtilities }) => {
      const { light, dark, css } =
        typeof preset === 'string' ? presets[preset] : preset;

      addBase({
        ':root': {
          ...getThemeStyles(cssPrefix, light),
          '--fd-sidebar-width': '0px',
          '--fd-toc-width': '0px',
          '--fd-layout-width': layoutWidth,
          // computed
          '--fd-doc':
            'calc(min(100vw, var(--fd-layout-width)) - var(--fd-toc-width) - var(--fd-sidebar-width))',
          '--fd-c-sidebar': 'var(--fd-sidebar-width)',
        },
        '.dark': getThemeStyles(cssPrefix, dark),
        '*': {
          'border-color': `theme('colors.fd-border')`,
        },
        body: {
          'background-color': `theme('colors.fd-background')`,
          color: `theme('colors.fd-foreground')`,
        },
        '@screen md': {
          ':root': {
            '--fd-sidebar-width': '240px',
          },
        },
        '@screen lg': {
          ':root': {
            '--fd-toc-width': '240px',
            '--fd-c-toc': 'calc(50vw - var(--fd-doc) / 2)',
            '--fd-c-sidebar': 'calc(50vw - var(--fd-doc) / 2)',
          },
        },
        '@screen xl': {
          ':root': { '--fd-sidebar-width': '260px', '--fd-toc-width': '260px' },
        },
      });

      if (css) addComponents(css);

      addComponents({
        '.fd-codeblock code span': {
          color: 'var(--shiki-light)',
        },
        '.dark .fd-codeblock code span': {
          color: 'var(--shiki-dark)',
        },
        '.fd-codeblock code': {
          display: 'grid',
          'font-size': '13px',
        },
        '.fd-codeblock .highlighted': {
          margin: '0 -16px',
          padding: '0 16px',
          'background-color': `theme('colors.fd-primary.DEFAULT / 10%')`,
        },
        '.fd-codeblock .highlighted-word': {
          padding: '1px 2px',
          margin: '-1px -3px',
          border: '1px solid',
          'border-color': `theme('colors.fd-primary.DEFAULT / 50%')`,
          'background-color': `theme('colors.fd-primary.DEFAULT / 10%')`,
          'border-radius': '2px',
        },
        '.fd-codeblock-keep-bg': {
          'background-color': 'var(--shiki-light-bg)',
        },
        '.dark .fd-codeblock-keep-bg': {
          'background-color': 'var(--shiki-dark-bg)',
        },
      });

      addUtilities({
        '.steps': {
          'counter-reset': 'step',
          'border-left-width': '1px',
          'margin-left': '1rem',
          'padding-left': '1.75rem',
          position: 'relative',
        },
        '.step:before': {
          'background-color': `theme('colors.fd-secondary.DEFAULT')`,
          color: `theme('colors.fd-secondary.foreground')`,
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
      });
    };
  },
  ({
    cssPrefix = '',
    modifyContainer = true,
    addGlobalColors = false,
  } = {}) => ({
    theme: {
      extend: {
        // Allow devs to use `container` to match with home layout
        container: modifyContainer
          ? {
              center: true,
              padding: '1rem',
              screens: {
                '2xl': '1400px',
              },
            }
          : undefined,
        maxWidth: {
          container: '1400px',
        },
        margin: {
          // the offset given to docs content when the sidebar is collapsed
          'fd-sidebar-offset':
            'max(calc(var(--fd-c-sidebar) - 2 * var(--fd-sidebar-width)), var(--fd-sidebar-width) * -1)',
        },
        colors: createTailwindColors(cssPrefix, addGlobalColors),
        ...animations,
      },
    },
  }),
);

export function createPreset(options: DocsUIOptions = {}): PresetsConfig {
  return {
    darkMode: 'class',
    plugins: [typography, docsUi(options)],
    theme: {
      extend: {
        typography: {
          DEFAULT: typographyConfig,
        },
      },
    },
  };
}

export { presets } from './theme/colors';
