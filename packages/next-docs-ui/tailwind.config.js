/** @type {import('tailwindcss').Config} */
module.exports = {
    darkMode: "class",
    content: ["./src/**/*.{ts,tsx}"],
    prefix: "nd-",
    theme: {
        container: {
            center: true,
            padding: "2rem",
            screens: {
                "2xl": "1200px",
            },
        },
        extend: {
            colors: {
                border: "hsl(var(--border))",
                input: "hsl(var(--input))",
                ring: "hsl(var(--ring))",
                background: "hsl(var(--background))",
                foreground: "hsl(var(--foreground))",
                primary: {
                    DEFAULT: "hsl(var(--primary))",
                    foreground: "hsl(var(--primary-foreground))",
                },
                secondary: {
                    DEFAULT: "hsl(var(--secondary))",
                    foreground: "hsl(var(--secondary-foreground))",
                },
                destructive: {
                    DEFAULT: "hsl(var(--destructive))",
                    foreground: "hsl(var(--destructive-foreground))",
                },
                muted: {
                    DEFAULT: "hsl(var(--muted))",
                    foreground: "hsl(var(--muted-foreground))",
                },
                accent: {
                    DEFAULT: "hsl(var(--accent))",
                    foreground: "hsl(var(--accent-foreground))",
                },
                popover: {
                    DEFAULT: "hsl(var(--popover))",
                    foreground: "hsl(var(--popover-foreground))",
                },
                card: {
                    DEFAULT: "hsl(var(--card))",
                    foreground: "hsl(var(--card-foreground))",
                },
            },
            keyframes: {
                "collapsible-down": {
                    from: { height: 0 },
                    to: { height: "var(--radix-collapsible-content-height)" },
                },
                "collapsible-up": {
                    from: { height: "var(--radix-collapsible-content-height)" },
                    to: { height: 0 },
                },
            },
            animation: {
                "collapsible-down": "collapsible-down 0.2s ease-out",
                "collapsible-up": "collapsible-up 0.2s ease-out",
            },
            typography: ({ theme }) => ({
                text: {
                    css: {
                        "--tw-prose-body": "hsl(var(--foreground))",
                        "--tw-prose-headings": "hsl(var(--foreground))",
                        "--tw-prose-lead": "hsl(var(--foreground))",
                        "--tw-prose-links": theme("colors.purple[400]"),
                        "--tw-prose-bold": "hsl(var(--foreground))",
                        "--tw-prose-counters": "hsl(var(--muted-foreground))",
                        "--tw-prose-bullets": "hsl(var(--foreground))",
                        "--tw-prose-hr": "hsl(var(--foreground))",
                        "--tw-prose-quotes": "hsl(var(--foreground))",
                        "--tw-prose-quote-borders": "hsl(var(--border))",
                        "--tw-prose-captions": "hsl(var(--foreground))",
                        "--tw-prose-code": "hsl(var(--foreground))",
                        "--tw-prose-pre-code": "hsl(var(--foreground))",
                        "--tw-prose-pre-bg": "hsl(var(--secondary)/0.5)",
                        "--tw-prose-th-borders": "hsl(var(--border))",
                        "--tw-prose-td-borders": "hsl(var(--border))",
                    },
                },
            }),
        },
    },
    plugins: [
        require("tailwindcss-animate"),
        require("@tailwindcss/typography"),
    ],
};
