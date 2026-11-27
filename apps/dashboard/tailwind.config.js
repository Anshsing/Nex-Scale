/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: '#090d16',
        card: '#0f172a',
        cardBorder: '#1e293b',
        accent: '#38bdf8',
        neon: '#10b981',
        danger: '#f43f5e',
        warning: '#f59e0b',
      },
    },
  },
  plugins: [],
};
