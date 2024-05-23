import typography from '@tailwindcss/typography';
import plugin from 'tailwindcss/plugin';
import type { CSSRuleObject, PresetsConfig } from 'tailwindcss/types/config';
import { presets } from './theme/colors';
import { animations } from './theme/animations';
import { typography as typographyConfig } from './theme/typography';

interface DocsUIOptions {
  /**
   * Prefix of colors
   */
  prefix?: string;

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

function colorToCSS(prefix: string, name: Keys): string {
  return `hsl(var(${variableName(prefix, name)}) / <alpha-value>)`;
}

export const docsUi = plugin.withOptions<DocsUIOptions>(
  ({
    prefix = '',
    preset = 'default',
    keepCodeBlockBackground = false,
  } = {}) => {
    return ({ addBase, addComponents, addUtilities }) => {
      const { light, dark, css } =
        typeof preset === 'string' ? presets[preset] : preset;

      addBase({
        ':root': getThemeStyles(prefix, light),
        '.dark': getThemeStyles(prefix, dark),
        '*': {
          'border-color': `theme('colors.border')`,
        },
        body: {
          'background-color': `theme('colors.background')`,
          color: `theme('colors.foreground')`,
        },

        '@screen md': {
          '#sidebar-background': {
            'inset-inline-start': 'calc((100vw - min(100vw,1400px))/-2)',
            width: 'calc((100vw - min(100vw,1400px))/2 + 100%)',
          },
          '#dynamic-sidebar #sidebar-background': {
            'inset-inline-start': '0',
            width: '100%',
          },
          '#dynamic-sidebar[data-open=false][data-hover=true]': {
            transform: 'translateX(0)',
          },
          '#dynamic-sidebar[data-open=false][data-hover=false]': {
            transform: 'translateX(calc(-100% - 1rem))',
          },
          '[dir=rtl] #dynamic-sidebar[data-open=false][data-hover=false]': {
            transform: 'translateX(calc(100% + 1rem))',
          },
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
        '.nd-codeblock': {
          '& .line': {
            'font-size': '13px',
          },
          '& .highlighted': {
            width: 'calc(100% + 32px)',
            display: 'inline-block',
            margin: '0 -16px',
            padding: 'p 16px',
            'background-color': `theme('colors.primary.DEFAULT / 10%')`,
          },
          '& .highlighted-word': {
            padding: '1px 2px',
            margin: '-1px -3px',
            border: '1px solid',
            'border-color': `theme('colors.primary.DEFAULT / 50%')`,
            'background-color': `theme('colors.primary.DEFAULT / 10%')`,
            'border-radius': '2px',
          },
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
          'background-color': `theme('colors.secondary.DEFAULT')`,
          color: `theme('colors.secondary.foreground')`,
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
  ({ prefix = '' } = {}) => ({
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
        colors: {
          border: colorToCSS(prefix, 'border'),
          ring: colorToCSS(prefix, 'ring'),
          background: colorToCSS(prefix, 'background'),
          foreground: colorToCSS(prefix, 'foreground'),
          primary: {
            DEFAULT: colorToCSS(prefix, 'primary'),
            foreground: colorToCSS(prefix, 'primary-foreground'),
          },
          secondary: {
            DEFAULT: colorToCSS(prefix, 'secondary'),
            foreground: colorToCSS(prefix, 'secondary-foreground'),
          },
          muted: {
            DEFAULT: colorToCSS(prefix, 'muted'),
            foreground: colorToCSS(prefix, 'muted-foreground'),
          },
          accent: {
            DEFAULT: colorToCSS(prefix, 'accent'),
            foreground: colorToCSS(prefix, 'accent-foreground'),
          },
          popover: {
            DEFAULT: colorToCSS(prefix, 'popover'),
            foreground: colorToCSS(prefix, 'popover-foreground'),
          },
          card: {
            DEFAULT: colorToCSS(prefix, 'card'),
            foreground: colorToCSS(prefix, 'card-foreground'),
          },
        },
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
