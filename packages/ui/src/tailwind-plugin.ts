import plugin from 'tailwindcss/plugin';
import type { CSSRuleObject, PresetsConfig } from 'tailwindcss/types/config';
import { presets } from './theme/colors';
import { animations } from './theme/animations';
import {
  type Options as TypographyOptions,
  typography,
} from './theme/typography';
import { roundedTable } from '@/theme/typography/styles';

export interface DocsUIOptions {
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

  /**
   * Disable custom table styles
   */
  disableRoundedTable?: boolean;

  typography?: TypographyOptions;
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
          '--fd-banner-height': '0px',
          '--fd-nav-height': '0px',

          '--fd-diff-remove-color': 'rgba(200,10,100,0.12)',
          '--fd-diff-remove-symbol-color': 'rgb(230,10,100)',
          '--fd-diff-add-color': 'rgba(14,180,100,0.12)',
          '--fd-diff-add-symbol-color': 'rgb(10,200,100)',
        },
        '.dark': getThemeStyles(cssPrefix, dark),
        '*': {
          'border-color': `theme('colors.fd-border')`,
        },
        body: {
          'background-color': `theme('colors.fd-background')`,
          color: `theme('colors.fd-foreground')`,
        },
      });

      if (css) addComponents(css);

      // Shiki styles
      addBase({
        '.shiki code span': {
          color: 'var(--shiki-light)',
        },
        '.dark .shiki code span': {
          color: 'var(--shiki-dark)',
        },
        '.fd-codeblock code': {
          display: 'grid',
          'font-size': '13px',
        },

        '.shiki code .diff.remove': {
          backgroundColor: 'var(--fd-diff-remove-color)',
          opacity: '0.7',
        },
        '.shiki code .diff::before': {
          position: 'absolute',
          left: '6px',
        },
        '.shiki code .diff.remove::before': {
          content: "'-'",
          color: 'var(--fd-diff-remove-symbol-color)',
        },
        '.shiki code .diff.add': {
          backgroundColor: 'var(--fd-diff-add-color)',
        },
        '.shiki code .diff.add::before': {
          content: "'+'",
          color: 'var(--fd-diff-add-symbol-color)',
        },
        '.shiki code .diff': {
          margin: '0 -16px',
          padding: '0 16px',
          position: 'relative',
        },
        '.shiki .highlighted': {
          margin: '0 -16px',
          padding: '0 16px',
          backgroundColor: `theme('colors.fd-primary.DEFAULT / 10%')`,
        },
        '.shiki .highlighted-word': {
          padding: '1px 2px',
          margin: '-1px -3px',
          border: '1px solid',
          borderColor: `theme('colors.fd-primary.DEFAULT / 50%')`,
          backgroundColor: `theme('colors.fd-primary.DEFAULT / 10%')`,
          borderRadius: '2px',
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
          'fd-container': '1400px',
        },
        spacing: {
          'fd-layout-top':
            'calc(var(--fd-banner-height) + var(--fd-nav-height))',
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
    plugins: [typography(options.typography ?? {}), docsUi(options)],
    theme: {
      extend: {
        typography: {
          DEFAULT: {
            css: {
              ...(!options.disableRoundedTable ? roundedTable : undefined),
            },
          },
        },
      },
    },
  };
}

export { typography };
export { presets } from './theme/colors';
