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
        bg: '#0a0c10',
        surface: '#111318',
        surface2: '#181c24',
        border: '#1f2535',
        accent: '#4af0b4',
        accent2: '#7c6af5',
        accent3: '#f5a84a',
        accent4: '#f56a6a',
      },
      fontFamily: {
        head: ['var(--font-unbounded)', 'sans-serif'],
        mono: ['var(--font-ibm-plex-mono)', 'monospace'],
      },
    },
  },
  plugins: [],
}
