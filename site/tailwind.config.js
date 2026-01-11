/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        skull: {
          black: '#030303',
          dark: '#0a0a0f',
          blood: '#8B0000',
          bloodBright: '#DC143C',
          bone: '#F5F5DC',
          green: '#00ff41',
          greenDark: '#003300',
          purple: '#4a0080',
        }
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      animation: {
        'glitch': 'glitch 0.3s infinite',
        'glitch-2': 'glitch-2 0.5s infinite',
        'drip': 'drip 2s ease-in infinite',
        'flicker': 'flicker 0.15s infinite',
        'scanline': 'scanline 8s linear infinite',
        'pulse-blood': 'pulse-blood 2s ease-in-out infinite',
        'float': 'float 3s ease-in-out infinite',
        'typing': 'typing 3.5s steps(40, end)',
        'blink': 'blink 1s step-end infinite',
      },
      keyframes: {
        glitch: {
          '0%, 100%': { transform: 'translate(0)' },
          '20%': { transform: 'translate(-2px, 2px)' },
          '40%': { transform: 'translate(-2px, -2px)' },
          '60%': { transform: 'translate(2px, 2px)' },
          '80%': { transform: 'translate(2px, -2px)' },
        },
        'glitch-2': {
          '0%, 100%': { opacity: 1 },
          '50%': { opacity: 0.8 },
          '25%, 75%': { opacity: 0.9, transform: 'skewX(0.5deg)' },
        },
        drip: {
          '0%': { transform: 'translateY(-100%)', opacity: 0 },
          '50%': { opacity: 1 },
          '100%': { transform: 'translateY(100vh)', opacity: 0 },
        },
        flicker: {
          '0%, 100%': { opacity: 1 },
          '50%': { opacity: 0.8 },
        },
        scanline: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100%)' },
        },
        'pulse-blood': {
          '0%, 100%': { boxShadow: '0 0 5px #8B0000, 0 0 10px #8B0000' },
          '50%': { boxShadow: '0 0 20px #DC143C, 0 0 40px #8B0000' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        typing: {
          'from': { width: 0 },
          'to': { width: '100%' },
        },
        blink: {
          '50%': { borderColor: 'transparent' },
        },
      },
    },
  },
  plugins: [],
}
