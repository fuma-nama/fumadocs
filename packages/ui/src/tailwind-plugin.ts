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
   * Color preset
   */
  preset?: keyof typeof presets | Preset;

  /**
   * Keep code block background of theme
   *
   * @defaultValue false
   */
  keepCodeBlockBackground?: boolean;
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
  ({
    cssPrefix = '',
    preset = 'default',
    keepCodeBlockBackground = false,
  } = {}) => {
    return ({ addBase, addComponents, addUtilities }) => {
      const { light, dark, css } =
        typeof preset === 'string' ? presets[preset] : preset;

      addBase({
        ':root': getThemeStyles(cssPrefix, light),
        '.dark': getThemeStyles(cssPrefix, dark),
        '*': {
          'border-color': `theme('colors.fd-border')`,
        },
        body: {
          'background-color': `theme('colors.fd-background')`,
          color: `theme('colors.fd-foreground')`,
        },
      });

      if (css) addBase(css);

      addComponents({
        '.nd-codeblock span': {
          color: 'var(--shiki-light)',
        },
        '.dark .nd-codeblock span': {
          color: 'var(--shiki-dark)',
        },
        '.nd-codeblock code': {
          display: 'grid',
          'font-size': '13px',
        },
        '.nd-codeblock .highlighted': {
          margin: '0 -16px',
          padding: '0 16px',
          'background-color': `theme('colors.fd-primary.DEFAULT / 10%')`,
        },
        '.nd-codeblock .highlighted-word': {
          padding: '1px 2px',
          margin: '-1px -3px',
          border: '1px solid',
          'border-color': `theme('colors.fd-primary.DEFAULT / 50%')`,
          'background-color': `theme('colors.fd-primary.DEFAULT / 10%')`,
          'border-radius': '2px',
        },
      });

      if (keepCodeBlockBackground) {
        addComponents({
          '.nd-codeblock': {
            color: 'var(--shiki-light)',
            'background-color': 'var(--shiki-light-bg)',
          },
          '.dark .nd-codeblock': {
            color: 'var(--shiki-dark)',
            'background-color': 'var(--shiki-dark-bg)',
          },
        });
      }

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
  ({ cssPrefix = '', addGlobalColors = false } = {}) => ({
    theme: {
      extend: {
        // Allow devs to use `container` for other elements
        container: {
          center: true,
          padding: '1rem',
          screens: {
            '2xl': '1400px',
          },
        },
        height: {
          body: [
            'calc(100vh - 4rem) /* fallback */',
            'calc(100dvh - 4rem)',
          ] as unknown as string,
        },
        maxWidth: {
          container: '1400px',
        },
        colors: createTailwindColors(cssPrefix, addGlobalColors),
        ...animations,
        typography: {
          DEFAULT: typographyConfig,
        },
      },
    },
  }),
);

export function createPreset(options: DocsUIOptions = {}): PresetsConfig {
  return {
    darkMode: 'class',
    plugins: [typography, docsUi(options)],
  };
}

export { presets } from './theme/colors';
