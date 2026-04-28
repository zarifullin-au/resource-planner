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
        bg: '#f7f8fb',
        surface: '#ffffff',
        surface2: '#f4f4f6',
        border: '#e4e6eb',
        accent: '#1A6BFF',
        accent2: '#6366f1',
        accent3: '#f59e0b',
        accent4: '#ef4444',
      },
      fontFamily: {
        head: ['var(--font-manrope)', 'sans-serif'],
        mono: ['var(--font-manrope)', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
