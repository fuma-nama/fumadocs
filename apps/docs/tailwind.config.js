// @ts-check
import { createPreset, presets } from 'fumadocs-ui/tailwind-plugin';
import animate from 'tailwindcss-animate';

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './content/**/*.{mdx,tsx}',
    './mdx-components.tsx',
    './node_modules/fumadocs-ui/dist/**/*.js',
    './node_modules/fumadocs-openapi/dist/**/*.js',
  ],
  presets: [
    createPreset({
      preset: {
        ...presets.default,
        dark: {
          ...presets.default.dark,
          background: '0 0% 2%',
          foreground: '0 0% 98%',
          popover: '0 0% 4%',
          card: '0 0% 4%',
          muted: '0 0% 8%',
          border: '0 0% 14%',
          accent: '0 0% 15%',
          'accent-foreground': '0 0% 100%',
          'muted-foreground': '0 0% 60%',
        },
      },
    }),
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-geist-sans)'],
        mono: ['var(--font-geist-mono)'],
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(circle, var(--tw-gradient-stops))',
        'repeat-gradient-to-r':
          'repeating-linear-gradient(to right, var(--tw-gradient-stops))',
        'repeat-gradient-to-br':
          'repeating-linear-gradient(to bottom right, var(--tw-gradient-stops))',
      },
      keyframes: {
        stroke: {
          from: {
            'stroke-dasharray': '1000',
          },
          to: {
            'stroke-dasharray': '1000',
            'stroke-dashoffset': '2000',
          },
        },
      },
      animation: {
        stroke: 'stroke 5s linear infinite',
      },
    },
  },
  plugins: [animate],
};
