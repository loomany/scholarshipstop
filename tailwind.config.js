const { fontFamily } = require('tailwindcss/defaultTheme');

/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ['class', '[data-theme="dark"]'],
  content: [
    'app/**/*.{ts,tsx}',
    'components/**/*.{ts,tsx}',
    'lib/**/*.{ts,tsx}',
    'pages/**/*.{ts,tsx}'
  ],
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: {
        '2xl': '1400px'
      }
    },
    extend: {
      fontFamily: {
        sans: ['var(--font-sans)', ...fontFamily.sans]
      },
      keyframes: {
        'accordion-down': {
          from: { height: 0 },
          to: { height: 'var(--radix-accordion-content-height)' }
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: 0 }
        },
        'home-fade-up': {
          from: { opacity: '0', transform: 'translateY(14px)' },
          to: { opacity: '1', transform: 'translateY(0)' }
        },
        'pain-fade-up': {
          from: { opacity: '0', transform: 'translateY(16px)' },
          to: { opacity: '1', transform: 'translateY(0)' }
        },
        /** Essay mic: soft transparent orange fill + glow while recording */
        'mic-recording-pulse': {
          '0%, 100%': {
            backgroundColor: 'rgba(255, 122, 26, 0.12)',
            boxShadow:
              '0 2px 8px -2px rgba(255, 122, 26, 0.28), 0 0 0 1px rgba(255, 178, 125, 0.55)'
          },
          '50%': {
            backgroundColor: 'rgba(255, 122, 26, 0.3)',
            boxShadow:
              '0 4px 18px -2px rgba(255, 122, 26, 0.48), 0 0 0 1px rgba(255, 122, 26, 0.55)'
          }
        },
        /** Skeleton loading stripes (see `components/ui/Shimmer.tsx`). */
        'shimmer-wave': {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' }
        },
        /** Scholarship hub/detail: pulsing brand mark while lists load (pairs with top orange nprogress). */
        'scholarship-brand-mark-breathe': {
          '0%, 100%': {
            transform: 'scale(1)',
            boxShadow:
              '0 4px 22px -10px rgba(15, 23, 42, 0.14), 0 0 0 1px rgba(228, 228, 231, 0.95)'
          },
          '50%': {
            transform: 'scale(1.07)',
            boxShadow:
              '0 14px 36px -12px rgba(249, 115, 22, 0.35), 0 0 0 1px rgba(251, 146, 60, 0.4)'
          }
        }
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        'home-fade-up': 'home-fade-up 0.75s cubic-bezier(0.22, 1, 0.36, 1) forwards',
        'home-fade-up-delay-1':
          'home-fade-up 0.75s cubic-bezier(0.22, 1, 0.36, 1) 0.08s forwards',
        'home-fade-up-delay-2':
          'home-fade-up 0.75s cubic-bezier(0.22, 1, 0.36, 1) 0.16s forwards',
        'home-fade-up-delay-3':
          'home-fade-up 0.75s cubic-bezier(0.22, 1, 0.36, 1) 0.24s forwards',
        'home-fade-up-delay-4':
          'home-fade-up 0.75s cubic-bezier(0.22, 1, 0.36, 1) 0.32s forwards',
        'pain-fade-up': 'pain-fade-up 0.45s ease-out forwards',
        'works-title-in': 'pain-fade-up 0.5s ease-out 0ms forwards',
        'works-mockup-in': 'pain-fade-up 0.5s ease-out 0.1s forwards',
        'works-benefit-1': 'pain-fade-up 0.45s ease-out 0.18s forwards',
        'works-benefit-2': 'pain-fade-up 0.45s ease-out 0.3s forwards',
        'works-benefit-3': 'pain-fade-up 0.45s ease-out 0.42s forwards',
        'works-cta-in': 'pain-fade-up 0.5s ease-out 0.52s forwards',
        'mic-recording-pulse': 'mic-recording-pulse 1.35s ease-in-out infinite',
        'shimmer-wave': 'shimmer-wave 1.35s ease-in-out infinite',
        'scholarship-brand-mark-breathe':
          'scholarship-brand-mark-breathe 1.85s cubic-bezier(0.45, 0, 0.55, 1) infinite'
      }
    }
  },
  plugins: [require('tailwindcss-animate')]
};
