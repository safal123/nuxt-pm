const animate = require("tailwindcss-animate")

/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  safelist: ["dark"],
  prefix: "",
  
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "var(--border-color, hsl(var(--border)))",
        input: "var(--input-color, hsl(var(--input)))",
        ring: "var(--ring-color, hsl(var(--ring)))",
        background: "var(--background-color, hsl(var(--background)))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "var(--primary-color, hsl(var(--primary)))",
          foreground: "var(--primary-foreground-color, hsl(var(--primary-foreground)))",
        },
        secondary: {
          DEFAULT: "var(--secondary-color, hsl(var(--secondary)))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "var(--muted-color, hsl(var(--muted)))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "var(--accent-color, hsl(var(--accent)))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "var(--popover-color, hsl(var(--popover)))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "var(--card-color, hsl(var(--card)))",
          foreground: "hsl(var(--card-foreground))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "var(--sidebar-primary-color, hsl(var(--sidebar-primary)))",
          "primary-foreground": "var(--sidebar-primary-foreground-color, hsl(var(--sidebar-primary-foreground)))",
          accent: "var(--sidebar-accent-color, hsl(var(--sidebar-accent)))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "var(--sidebar-border-color, hsl(var(--sidebar-border)))",
          ring: "hsl(var(--sidebar-ring))",
        },
      },
      borderRadius: {
        xl: "calc(var(--radius) + 4px)",
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: 0 },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: 0 },
        },
        "collapsible-down": {
          from: { height: 0 },
          to: { height: 'var(--radix-collapsible-content-height)' },
        },
        "collapsible-up": {
          from: { height: 'var(--radix-collapsible-content-height)' },
          to: { height: 0 },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "collapsible-down": "collapsible-down 0.2s ease-in-out",
        "collapsible-up": "collapsible-up 0.2s ease-in-out",
      },
    },
  },
  plugins: [animate],
}