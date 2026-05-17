/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
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
        glow: "hsl(var(--glow))",
        surface: "hsl(var(--surface))",
        "surface-elevated": "hsl(var(--surface-elevated))",
        hover: "hsl(var(--hover))",
        "lunar": {
          50: "#F5F3FF",
          100: "#EDE9FE",
          200: "#DDD6FE",
          300: "#C4B5FD",
          400: "#A78BFA",
          500: "#8B5CF6",
          DEFAULT: "#C4B5FD",
        },
        "space": {
          950: "#0D0D0D",
          900: "#111111",
          850: "#141414",
          800: "#1A1A1A",
          700: "#1F1F1F",
          600: "#262626",
          500: "#333333",
          400: "#404040",
          300: "#525252",
          200: "#737373",
          100: "#A0A0A0",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 3px)",
        sm: "calc(var(--radius) - 6px)",
      },
      boxShadow: {
        "glow-sm": "0 0 20px -4px hsl(var(--glow) / 0.06)",
        "glow-md": "0 0 30px -6px hsl(var(--glow) / 0.1)",
        "glow-lg": "0 0 50px -10px hsl(var(--glow) / 0.14)",
        "glow-ring": "0 0 0 1px hsl(var(--glow) / 0.1), 0 0 25px -5px hsl(var(--glow) / 0.08)",
        "inner-glow": "inset 0 1px 2px hsl(0 0% 100% / 0.02), inset 0 -1px 2px hsl(0 0% 0% / 0.1)",
        "ambient": "0 12px 40px -12px hsl(0 0% 0% / 0.5)",
        "soft": "0 4px 16px -4px hsl(0 0% 0% / 0.25)",
        "soft-xs": "0 1px 2px 0 rgb(0 0 0 / 0.03)",
        "soft-sm": "0 1px 3px 0 rgb(0 0 0 / 0.04), 0 1px 2px -1px rgb(0 0 0 / 0.03)",
        "soft-md": "0 4px 6px -1px rgb(0 0 0 / 0.04), 0 2px 4px -2px rgb(0 0 0 / 0.03)",
        "soft-lg": "0 10px 15px -3px rgb(0 0 0 / 0.04), 0 4px 6px -4px rgb(0 0 0 / 0.03)",
        "soft-xl": "0 20px 25px -5px rgb(0 0 0 / 0.04), 0 8px 10px -6px rgb(0 0 0 / 0.03)",
        "elevated": "0 1px 3px rgb(0 0 0 / 0.04), 0 8px 24px rgb(0 0 0 / 0.06)",
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
        "breathe": {
          "0%, 100%": { opacity: "0.35" },
          "50%": { opacity: "0.85" },
        },
        "glow-pulse": {
          "0%, 100%": { boxShadow: "0 0 10px -3px hsl(var(--glow) / 0.1)" },
          "50%": { boxShadow: "0 0 25px -6px hsl(var(--glow) / 0.2)" },
        },
        "fade-in-up": {
          from: { opacity: "0", transform: "translateY(6px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "breathe": "breathe 3.5s ease-in-out infinite",
        "glow-pulse": "glow-pulse 3s ease-in-out infinite",
        "fade-in-up": "fade-in-up 0.5s cubic-bezier(0.25, 0.1, 0.25, 1) both",
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'Consolas', 'monospace'],
      },
      transitionTimingFunction: {
        "smooth": "cubic-bezier(0.25, 0.1, 0.25, 1)",
      },
      transitionDuration: {
        "300": "300ms",
        "400": "400ms",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}
