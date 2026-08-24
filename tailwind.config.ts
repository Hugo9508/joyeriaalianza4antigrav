import type { Config } from 'tailwindcss';
const { fontFamily } = require('tailwindcss/defaultTheme');

export default {
  darkMode: ['class'],
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    // Container nativo desactivado: usamos .container-boutique para tener UN solo ancho.
    container: { center: true, padding: '0', screens: { '2xl': '1280px' } },
    extend: {
      fontFamily: {
        body:     ['var(--font-manrope)', ...fontFamily.sans],
        headline: ['var(--font-playfair)', ...fontFamily.serif],
      },

      // ── Escala tipográfica: [size, { lineHeight, letterSpacing, fontWeight }] ──
      // Piso absoluto: 11px. Prohibido text-[8px] / text-[9px] / text-[10px].
      fontSize: {
        'eyebrow':    ['0.6875rem', { lineHeight: '1',    letterSpacing: '0.28em',  fontWeight: '600' }], // 11px
        'caption':    ['0.75rem',   { lineHeight: '1.45', letterSpacing: '0.02em',  fontWeight: '500' }], // 12px
        'body-sm':    ['0.8125rem', { lineHeight: '1.65', letterSpacing: '0.005em', fontWeight: '400' }], // 13px
        'body':       ['0.9375rem', { lineHeight: '1.75', letterSpacing: '0',       fontWeight: '400' }], // 15px
        'body-lg':    ['1.0625rem', { lineHeight: '1.75', letterSpacing: '-0.005em',fontWeight: '300' }], // 17px
        'lead':       ['1.25rem',   { lineHeight: '1.65', letterSpacing: '-0.01em', fontWeight: '300' }], // 20px
        'price':      ['1.5rem',    { lineHeight: '1.1',  letterSpacing: '-0.01em', fontWeight: '400' }], // 24px
        'price-lg':   ['2rem',      { lineHeight: '1.05', letterSpacing: '-0.015em',fontWeight: '400' }], // 32px
        'h4':         ['1.125rem',  { lineHeight: '1.35', letterSpacing: '-0.01em', fontWeight: '500' }], // 18px
        'h3':         ['1.5rem',    { lineHeight: '1.25', letterSpacing: '-0.015em',fontWeight: '400' }], // 24px
        'h2':         ['2.25rem',   { lineHeight: '1.12', letterSpacing: '-0.02em', fontWeight: '400' }], // 36px
        'h1':         ['3rem',      { lineHeight: '1.06', letterSpacing: '-0.025em',fontWeight: '400' }], // 48px
        'display':    ['clamp(2.75rem, 6vw, 5rem)',  { lineHeight: '1.02', letterSpacing: '-0.03em',  fontWeight: '400' }],
        'display-xl': ['clamp(3.25rem, 8vw, 7.5rem)',{ lineHeight: '0.95', letterSpacing: '-0.035em', fontWeight: '400' }],
      },

      colors: {
        background:  'hsl(var(--background))',
        surface:     'hsl(var(--surface))',
        'surface-sunken': 'hsl(var(--surface-sunken))',
        foreground:  'hsl(var(--foreground))',
        border:      'hsl(var(--border))',
        'border-strong': 'hsl(var(--border-strong))',
        input:       'hsl(var(--input))',
        ring:        'hsl(var(--ring))',
        gold: {
          DEFAULT: 'hsl(var(--gold))',
          ink:     'hsl(var(--gold-ink))',
          soft:    'hsl(var(--gold-soft))',
        },
        sage: {
          DEFAULT: 'hsl(var(--sage))',
          foreground: 'hsl(var(--sage-foreground))',
        },
        primary:   { DEFAULT: 'hsl(var(--primary))',   foreground: 'hsl(var(--primary-foreground))' },
        secondary: { DEFAULT: 'hsl(var(--secondary))', foreground: 'hsl(var(--secondary-foreground))' },
        destructive:{DEFAULT: 'hsl(var(--destructive))',foreground: 'hsl(var(--destructive-foreground))' },
        muted:     { DEFAULT: 'hsl(var(--muted))',     foreground: 'hsl(var(--muted-foreground))' },
        subtle:    { foreground: 'hsl(var(--subtle-foreground))' },
        accent:    { DEFAULT: 'hsl(var(--accent))',    foreground: 'hsl(var(--accent-foreground))' },
        popover:   { DEFAULT: 'hsl(var(--popover))',   foreground: 'hsl(var(--popover-foreground))' },
        card:      { DEFAULT: 'hsl(var(--card))',      foreground: 'hsl(var(--card-foreground))' },
        success:   'hsl(var(--success))',
        warning:   'hsl(var(--warning))',
      },

      borderRadius: {
        none: 'var(--radius-none)',
        xs:   'var(--radius-xs)',
        sm:   'var(--radius-sm)',
        DEFAULT: 'var(--radius-md)',
        md:   'var(--radius-md)',
        lg:   'var(--radius-lg)',
        full: 'var(--radius-full)',
      },

      boxShadow: {
        hairline: 'var(--shadow-hairline)',
        xs: 'var(--shadow-xs)',
        sm: 'var(--shadow-sm)',
        md: 'var(--shadow-md)',
        lg: 'var(--shadow-lg)',
        modal: 'var(--shadow-modal)',
        none: 'none',
      },

      spacing: {
        'gutter':    'var(--gutter)',
        'section':   'var(--section-y)',
        'section-lg':'var(--section-y-lg)',
        18: '4.5rem', 22: '5.5rem', 30: '7.5rem', 38: '9.5rem',
      },
      maxWidth: { boutique: 'var(--container)', prose: '62ch' },

      transitionDuration: {
        instant: 'var(--dur-instant)',
        fast:    'var(--dur-fast)',
        base:    'var(--dur-base)',
        slow:    'var(--dur-slow)',
      },
      transitionTimingFunction: {
        out:      'var(--ease-out)',
        'in-out': 'var(--ease-in-out)',
        standard: 'var(--ease-standard)',
      },
      letterSpacing: {
        tightest: '-0.035em', tighter: '-0.025em', tight: '-0.015em',
        wide: '0.08em', wider: '0.16em', widest: '0.28em',
      },
      aspectRatio: { product: '4 / 5', hero: '3 / 2', wide: '16 / 9' },

      keyframes: {
        'accordion-down': { from: { height: '0' }, to: { height: 'var(--radix-accordion-content-height)' } },
        'accordion-up':   { from: { height: 'var(--radix-accordion-content-height)' }, to: { height: '0' } },
        'rise':   { '0%': { opacity: '0', transform: 'translateY(16px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
        'veil':   { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        'shimmer':{ to: { backgroundPosition: '-200% 0' } },
        // Preservada del config anterior: la usa el hero de page.tsx
        // (animate-fade-in-up ×4, con animationDelay escalonado inline).
        // El reemplazo de doc 11 no la traía — se agrega acá para no romper
        // la entrada del hero.
        'fade-in-up': {
          '0%':   { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down var(--dur-base) var(--ease-out)',
        'accordion-up':   'accordion-up var(--dur-base) var(--ease-out)',
        'rise':    'rise var(--dur-slow) var(--ease-out) forwards',
        'veil':    'veil var(--dur-base) var(--ease-out) forwards',
        'shimmer': 'shimmer 1.6s var(--ease-in-out) infinite',
        'fade-in-up': 'fade-in-up 0.8s var(--ease-out) forwards',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
} satisfies Config;
