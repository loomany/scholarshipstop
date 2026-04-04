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
        'works-cta-in': 'pain-fade-up 0.5s ease-out 0.52s forwards'
      }
    }
  },
  plugins: [require('tailwindcss-animate')]
};
