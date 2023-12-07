import typography from '@tailwindcss/typography'
import animate from 'tailwindcss-animate'
import plugin from 'tailwindcss/plugin'

type NextDocsUIOptions = {
  enabled: boolean
}

/**
 * Dependency plugins
 */
export const docsUiPlugins = [animate, typography]

export const docsUi = plugin.withOptions<NextDocsUIOptions>(
  () => {
    return ({ addBase, addComponents, addUtilities }) => {
      addBase({
        ':root': {
          '--background': '0 0% 100%',
          '--foreground': '0 0% 3.9%',
          '--muted': '0 0% 96.1%',
          '--muted-foreground': '0 0% 45.1%',
          '--popover': '0 0% 100%',
          '--popover-foreground': '0 0% 15.1%',
          '--card': '0 0% 99.7%',
          '--card-foreground': '0 0% 3.9%',
          '--border': '0 0% 89.8%',
          '--input': '0 0% 89.8%',
          '--primary': '0 0% 9%',
          '--primary-foreground': '0 0% 98%',
          '--secondary': '0 0% 96.1%',
          '--secondary-foreground': '0 0% 9%',
          '--accent': '0 0% 94.1%',
          '--accent-foreground': '0 0% 9%',
          '--ring': '0 0% 63.9%'
        },

        '.dark': {
          '--background': '0 0% 3.9%',
          '--foreground': '0 0% 98%',
          '--muted': '0 0% 14.9%',
          '--muted-foreground': '0 0% 60.9%',
          '--popover': '0 0% 7%',
          '--popover-foreground': '0 0% 88%',
          '--card': '0 0% 8%',
          '--card-foreground': '0 0% 98%',
          '--border': '0 0% 18%',
          '--input': '0 0% 14.9%',
          '--primary': '0 0% 98%',
          '--primary-foreground': '0 0% 9%',
          '--secondary': '0 0% 14.9%',
          '--secondary-foreground': '0 0% 98%',
          '--accent': '0 0% 14.9%',
          '--accent-foreground': '0 0% 98%',
          '--ring': '0 0% 14.9%'
        },

        '*': {
          'border-color': `theme('colors.border')`
        },
        body: {
          'background-color': `theme('colors.background')`,
          color: `theme('colors.foreground')`
        }
      })

      addComponents({
        '.nd-codeblock [data-line]': {
          'padding-left': `theme('spacing.4')`,
          'padding-right': `theme('spacing.4')`,
          'border-left-width': `theme('borderWidth.2')`,
          'border-color': 'transparent'
        },

        '.nd-codeblock [data-highlighted-line]': {
          'border-color': `theme('colors.primary.DEFAULT')`,
          'background-color': `theme('colors.primary.DEFAULT / 10%')`
        },

        '[data-highlighted-chars]': {
          'background-color': `theme('colors.primary.DEFAULT / 10%')`,
          'border-bottom-width': `theme('borderWidth.2')`,
          'border-color': `theme('colors.primary.DEFAULT')`
        },
        '[data-line] span': {
          color: 'var(--shiki-light)'
        },

        '.dark [data-line] span': {
          color: 'var(--shiki-dark)'
        },
        '[data-rmiz]': {
          display: 'block',
          position: 'relative'
        },

        '[data-rmiz-ghost]': {
          'pointer-events': 'none',
          position: 'absolute'
        },

        '[data-rmiz-btn-zoom], [data-rmiz-btn-unzoom]': {
          display: 'none'
        },
        "[data-rmiz-content='found'] img": {
          cursor: 'zoom-in'
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
          overflow: 'hidden'
        },
        '[data-rmiz-modal]:focus-visible': {
          outline: 'none'
        },
        '[data-rmiz-modal-overlay]': {
          transition: 'background-color 0.3s',
          position: 'absolute',
          inset: '0'
        },
        "[data-rmiz-modal-overlay='hidden']": {
          'background-color': 'transparent'
        },
        "[data-rmiz-modal-overlay='visible']": {
          'background-color': `theme('colors.background / 80%')`
        },
        '[data-rmiz-modal-content]': {
          width: '100%',
          height: '100%',
          position: 'relative'
        },
        '[data-rmiz-modal]::backdrop': {
          display: 'none'
        },
        '[data-rmiz-modal-img]': {
          cursor: 'zoom-out',
          'image-rendering': 'high-quality',
          'transform-origin': '0 0',
          transition: 'transform 0.3s',
          position: 'absolute'
        },
        '@media (prefers-reduced-motion: reduce)': {
          '[data-rmiz-modal-overlay], [data-rmiz-modal-img]': {
            'transition-duration': '0.01ms !important'
          }
        }
      })

      addUtilities({
        '.steps': {
          'counter-reset': 'step',
          'border-left-width': '1px',
          'margin-left': '1rem',
          'padding-left': '1.75rem',
          position: 'relative'
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
          left: '-1rem'
        },
        '.prose-no-margin': {
          '& > :first-child': {
            marginTop: '0'
          },
          '& > :last-child': {
            marginBottom: '0'
          }
        }
      })
    }
  },
  () => ({
    theme: {
      extend: {
        container: {
          center: true,
          padding: '1rem',
          screens: {
            '2xl': '1400px'
          }
        },
        fontSize: {
          medium: '15px'
        },
        height: {
          body: [
            'calc(100vh - 4rem) /* fallback */',
            'calc(100dvh - 4rem)'
          ] as unknown as string
        },
        colors: {
          border: 'hsl(var(--border) / <alpha-value>)',
          input: 'hsl(var(--input) / <alpha-value>)',
          ring: 'hsl(var(--ring) / <alpha-value>)',
          background: 'hsl(var(--background) / <alpha-value>)',
          foreground: 'hsl(var(--foreground) / <alpha-value>)',
          primary: {
            DEFAULT: 'hsl(var(--primary) / <alpha-value>)',
            foreground: 'hsl(var(--primary-foreground) / <alpha-value>)'
          },
          secondary: {
            DEFAULT: 'hsl(var(--secondary) / <alpha-value>)',
            foreground: 'hsl(var(--secondary-foreground) / <alpha-value>)'
          },
          muted: {
            DEFAULT: 'hsl(var(--muted) / <alpha-value>)',
            foreground: 'hsl(var(--muted-foreground) / <alpha-value>)'
          },
          accent: {
            DEFAULT: 'hsl(var(--accent) / <alpha-value>)',
            foreground: 'hsl(var(--accent-foreground) / <alpha-value>)'
          },
          popover: {
            DEFAULT: 'hsl(var(--popover) / <alpha-value>)',
            foreground: 'hsl(var(--popover-foreground) / <alpha-value>)'
          },
          card: {
            DEFAULT: 'hsl(var(--card) / <alpha-value>)',
            foreground: 'hsl(var(--card-foreground) / <alpha-value>)'
          }
        },
        keyframes: {
          'collapsible-down': {
            from: { height: '0', opacity: '0' },
            to: {
              height: 'var(--radix-collapsible-content-height)'
            }
          },
          'collapsible-up': {
            from: {
              height: 'var(--radix-collapsible-content-height)'
            },
            to: { height: '0', opacity: '0' }
          },
          'accordion-down': {
            from: { height: '0', opacity: '0.5' },
            to: { height: 'var(--radix-accordion-content-height)' }
          },
          'accordion-up': {
            from: { height: 'var(--radix-accordion-content-height)' },
            to: { height: '0', opacity: '0.5' }
          }
        },
        animation: {
          'collapsible-down': 'collapsible-down 150ms ease-out',
          'collapsible-up': 'collapsible-up 150ms ease-out',
          'accordion-down': 'accordion-down 200ms ease-out',
          'accordion-up': 'accordion-up 200ms ease-out'
        },
        typography: {
          DEFAULT: {
            css: {
              '--tw-prose-body': `theme('colors.foreground / 90%')`,
              '--tw-prose-headings': `theme('colors.foreground')`,
              '--tw-prose-lead': `theme('colors.foreground')`,
              '--tw-prose-links': `theme('colors.foreground')`,
              '--tw-prose-bold': `theme('colors.foreground')`,
              '--tw-prose-counters': `theme('colors.muted.foreground')`,
              '--tw-prose-bullets': `theme('colors.muted.foreground')`,
              '--tw-prose-hr': `theme('colors.border')`,
              '--tw-prose-quotes': `theme('colors.foreground')`,
              '--tw-prose-quote-borders': `theme('colors.border')`,
              '--tw-prose-captions': `theme('colors.foreground')`,
              '--tw-prose-code': `theme('colors.foreground')`,
              '--tw-prose-th-borders': `theme('colors.border')`,
              '--tw-prose-td-borders': `theme('colors.border')`,
              '--tw-prose-pre-bg': `theme('colors.secondary.DEFAULT')`,
              '--tw-prose-kbd': `theme('colors.foreground')`,
              '--tw-prose-kbd-shadows': `theme('colors.primary.DEFAULT / 50%')`,
              // not used
              '--tw-prose-pre-code': false,
              fontSize: '15px',
              maxWidth: 'none',
              a: {
                transition: 'opacity 0.3s',
                fontWeight: '400',
                textDecoration: 'underline',
                textUnderlineOffset: '2px',
                textDecorationColor: `theme('colors.primary.DEFAULT')`
              },
              'a:hover': {
                opacity: '80%'
              },
              h2: {
                fontWeight: '600'
              },
              table: {
                whiteSpace: 'nowrap'
              },
              code: {
                padding: '4px',
                borderRadius: '5px',
                fontWeight: '400',
                background: `theme('colors.muted.DEFAULT')`
              },
              kbd: {
                boxShadow:
                  '0 0 0 1px var(--tw-prose-kbd-shadows),0 3px 0 var(--tw-prose-kbd-shadows)'
              },
              ul: {
                paddingLeft: '1rem'
              },
              'ul > li': {
                fontSize: '0.9rem'
              },
              // Disabled styles, handled by Next Docs
              'pre code': false,
              'pre code::after': false,
              'pre code::before': false,
              'code::after': false,
              'code::before': false
            }
          }
        }
      }
    }
  })
)
