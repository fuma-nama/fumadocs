/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './content/**/*.mdx',
    './mdx-components.tsx'
  ],
  theme: {
    container: {
      center: true,
      padding: '1.5rem',
      screens: {
        '2xl': '1100px'
      }
    },
    extend: {
      backgroundImage: {
        'gradient-radial': 'radial-gradient(circle, var(--tw-gradient-stops))',
        'repeat-gradient-to-r':
          'repeating-linear-gradient(to right, var(--tw-gradient-stops))'
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
        updown: {
          'from, to': {
            transform: 'translateY(-20px)'
          },
          '50%': {
            transform: 'translateY(20px)'
          }
        },
        light: {
          'from, to': {
            opacity: 0.7
          },
          '50%': {
            opacity: 1
          }
        },
        stroke: {
          from: {
            'stroke-dasharray': 1000
          },
          to: {
            'stroke-dasharray': 1000,
            'stroke-dashoffset': 2000
          }
        }
      },
      animation: {
        stroke: 'stroke 5s linear infinite',
        light: 'light 2s ease-in-out infinite',
        updown: 'updown 3s ease-in-out infinite'
      }
    }
  },
  plugins: [require('tailwindcss-animate')]
}
