import typography from '@tailwindcss/typography';
import plugin from 'tailwindcss/plugin';
import type { PresetsConfig } from 'tailwindcss/types/config';
import { presets } from './theme/colors';
import { animations } from './theme/animations';
import { typography as typographyConfig } from './theme/typography';

interface DocsUIOptions {
  /**
   * Prefix of colors
   */
  prefix?: string;

  preset?: keyof typeof presets | Preset;
}

export interface Preset {
  light: Record<string, string>;
  dark: Record<string, string>;
  backgroundImage?: string;
}

// TODO: Remove in next major
/**
 * @deprecated Use preset instead
 */
export const docsUiPlugins = [typography];

function mapColors(
  prefix: string,
  map: Record<string, string>,
): Record<string, string> {
  return Object.fromEntries(
    Object.entries(map).map(([k, v]) => [colorToVariable(prefix, k), v]),
  );
}

function colorToVariable(prefix: string, name: string): string {
  return `--${[prefix, name].filter(Boolean).join('-')}`;
}

function colorToCSS(prefix: string, name: string): string {
  return `hsl(var(${colorToVariable(prefix, name)}) / <alpha-value>)`;
}

export const docsUi = plugin.withOptions<DocsUIOptions>(
  ({ prefix = '', preset = 'default' } = {}) => {
    return ({ addBase, addComponents, addUtilities }) => {
      const { light, dark, backgroundImage } =
        typeof preset === 'string' ? presets[preset] : preset;

      addBase({
        ':root': mapColors(prefix, light),
        '.dark': mapColors(prefix, dark),
        '*': {
          'border-color': `theme('colors.border')`,
        },
        body: {
          'background-image': backgroundImage ?? 'initial',
          'background-color': `theme('colors.background')`,
          color: `theme('colors.foreground')`,
        },
        '[data-line] span': {
          color: 'var(--shiki-light)',
        },
        '.dark [data-line] span': {
          color: 'var(--shiki-dark)',
        },
        '[data-rmiz]': {
          display: 'block',
          position: 'relative',
        },
        '[data-rmiz-ghost]': {
          'pointer-events': 'none',
          position: 'absolute',
        },
        '[data-rmiz-btn-zoom], [data-rmiz-btn-unzoom]': {
          display: 'none',
        },
        "[data-rmiz-content='found'] img": {
          cursor: 'zoom-in',
        },
        '[data-rmiz-modal][open]': {
          width: ['100vw /* fallback */', '100dvw'],
          height: ['100vh /* fallback */', '100dvh'],
          'background-color': 'transparent',
          'max-width': 'none',
          'max-height': 'none',
          margin: '0',
          padding: '0',
          position: 'fixed',
          overflow: 'hidden',
        },
        '[data-rmiz-modal]:focus-visible': {
          outline: 'none',
        },
        '[data-rmiz-modal-overlay]': {
          transition: 'background-color 0.3s',
          position: 'absolute',
          inset: '0',
        },
        "[data-rmiz-modal-overlay='hidden']": {
          'background-color': 'transparent',
        },
        "[data-rmiz-modal-overlay='visible']": {
          'background-color': `theme('colors.background / 80%')`,
        },
        '[data-rmiz-modal-content]': {
          width: '100%',
          height: '100%',
          position: 'relative',
        },
        '[data-rmiz-modal]::backdrop': {
          display: 'none',
        },
        '[data-rmiz-modal-img]': {
          cursor: 'zoom-out',
          'image-rendering': 'high-quality',
          'transform-origin': '0 0',
          transition: 'transform 0.3s',
          position: 'absolute',
        },
        '@media (prefers-reduced-motion: reduce)': {
          '[data-rmiz-modal-overlay], [data-rmiz-modal-img]': {
            'transition-duration': '0.01ms !important',
          },
        },
      });

      addComponents({
        '.nd-codeblock': {
          '& [data-line]': {
            'padding-left': `theme('spacing.4')`,
            'padding-right': `theme('spacing.4')`,
          },
          '& [data-highlighted-line]': {
            'background-color': `theme('colors.primary.DEFAULT / 10%')`,
          },
          '& [data-highlighted-chars]': {
            'background-color': `theme('colors.primary.DEFAULT / 10%')`,
            'border-bottom-width': `theme('borderWidth.2')`,
            'border-color': `theme('colors.primary.DEFAULT')`,
          },
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
        container: {
          center: true,
          padding: '1rem',
          screens: {
            '2xl': '1400px',
          },
        },
        fontSize: {
          medium: '15px',
        },
        height: {
          body: [
            'calc(100vh - 4rem) /* fallback */',
            'calc(100dvh - 4rem)',
          ] as unknown as string,
        },
        colors: {
          border: colorToCSS(prefix, 'border'),
          input: colorToCSS(prefix, 'input'),
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
    plugins: [typography, docsUi(options)],
  };
}

export default createPreset;
