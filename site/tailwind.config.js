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
        void: '#000000',
        abyss: '#050505',
        dark: '#0a0a0a',
        surface: '#111111',
        skull: {
          border: '#1a1a1a',
          blood: '#8B0000',
          'blood-bright': '#B22222',
          'blood-glow': '#DC143C',
          bone: '#2a2a2a',
          text: '#666666',
          'text-dim': '#444444',
          'text-bright': '#888888',
        }
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Share Tech Mono', 'monospace'],
      },
      animation: {
        'glitch': 'glitch 0.3s infinite',
        'drip': 'drip 4s ease-in infinite',
        'flicker': 'flicker 0.1s infinite',
        'scanline': 'scanline 10s linear infinite',
        'pulse-blood': 'pulse-blood 2s ease-in-out infinite',
        'blink': 'blink 1s step-end infinite',
      },
      keyframes: {
        glitch: {
          '0%, 100%': { transform: 'translate(0)' },
          '20%': { transform: 'translate(-1px, 1px)' },
          '40%': { transform: 'translate(-1px, -1px)' },
          '60%': { transform: 'translate(1px, 1px)' },
          '80%': { transform: 'translate(1px, -1px)' },
        },
        drip: {
          '0%': { transform: 'translateY(-100%)', opacity: 0 },
          '10%': { opacity: 0.4 },
          '90%': { opacity: 0.4 },
          '100%': { transform: 'translateY(100vh)', opacity: 0 },
        },
        flicker: {
          '0%, 100%': { opacity: 1 },
          '50%': { opacity: 0.95 },
        },
        scanline: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100%)' },
        },
        'pulse-blood': {
          '0%, 100%': { boxShadow: '0 0 2px #8B0000' },
          '50%': { boxShadow: '0 0 10px #8B0000, 0 0 20px #8B0000' },
        },
        blink: {
          '50%': { opacity: 0 },
        },
      },
    },
  },
  plugins: [],
}
