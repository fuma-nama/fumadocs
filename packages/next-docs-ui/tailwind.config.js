const tailwind_steps = ({ addUtilities }) => {
  addUtilities({
    '.steps': {
      'counter-reset': 'step',
      'border-left-width': '1px',
      'margin-left': '1rem',
      'padding-left': '1.75rem',
      position: 'relative'
    },

    '.step': {
      '&:before': {
        'background-color': 'hsl(var(--secondary))',
        color: 'hsl(var(--secondary-foreground))',
        content: 'counter(step)',
        'counter-increment': 'step',
        'border-radius': '9999px',
        'justify-content': 'center',
        'align-items': 'center',
        width: '2rem',
        height: '2rem',
        'font-size': '.875rem',
        'line-height': '1.25rem',
        display: 'flex',
        position: 'absolute',
        left: '-1rem'
      }
    }
  })
}

/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ['class', '[class*="dark"]'],
  content: ['./src/**/*.{ts,tsx}'],
  prefix: 'nd-',
  theme: {
    container: {
      center: true,
      padding: '1.25rem',
      screens: {
        '2xl': '1400px'
      }
    },
    extend: {
      fontSize: {
        medium: '15px'
      },
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))'
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))'
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))'
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))'
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))'
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))'
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))'
        }
      },
      keyframes: {
        'collapsible-down': {
          from: { height: 0, opacity: 0 },
          to: {
            height: 'var(--radix-collapsible-content-height)'
          }
        },
        'collapsible-up': {
          from: {
            height: 'var(--radix-collapsible-content-height)'
          },
          to: { height: 0, opacity: 0 }
        },
        'accordion-down': {
          from: { height: 0 },
          to: { height: 'var(--radix-accordion-content-height)' }
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: 0 }
        }
      },
      animation: {
        'collapsible-down': 'collapsible-down 150ms ease-out',
        'collapsible-up': 'collapsible-up 150ms ease-out',
        'accordion-down': 'accordion-down 200ms ease-out',
        'accordion-up': 'accordion-up 200ms ease-out'
      },
      typography: () => ({
        text: {
          css: {
            '--tw-prose-body': 'hsl(var(--foreground)/0.9)',
            '--tw-prose-headings': 'hsl(var(--foreground))',
            '--tw-prose-lead': 'hsl(var(--foreground))',
            '--tw-prose-links': 'hsl(var(--foreground))',
            '--tw-prose-bold': 'hsl(var(--foreground))',
            '--tw-prose-counters': 'hsl(var(--muted-foreground))',
            '--tw-prose-bullets': 'hsl(var(--muted-foreground))',
            '--tw-prose-hr': 'hsl(var(--border))',
            '--tw-prose-quotes': 'hsl(var(--foreground))',
            '--tw-prose-quote-borders': 'hsl(var(--border))',
            '--tw-prose-captions': 'hsl(var(--foreground))',
            '--tw-prose-code': 'hsl(var(--foreground))',
            '--tw-prose-th-borders': 'hsl(var(--border))',
            '--tw-prose-td-borders': 'hsl(var(--border))',
            a: {
              transition: 'opacity 0.3s',
              'font-weight': '400',
              'text-decoration': 'underline',
              'text-underline-offset': '2px',
              'text-decoration-color': 'hsl(var(--primary))',
              '&:hover': {
                opacity: '80%'
              }
            },
            h2: {
              'font-weight': '600'
            },
            code: {
              padding: '4px',
              'border-radius': '5px',
              'font-weight': '400',
              background: 'hsl(var(--muted))',
              '&::before, &::after': {
                content: 'none'
              }
            },
            ul: {
              'padding-left': '1rem'
            },
            'ul>li': {
              'font-size': '0.9rem'
            }
          }
        }
      })
    }
  },
  plugins: [
    require('tailwindcss-animate'),
    require('@tailwindcss/typography'),
    tailwind_steps
  ]
}
