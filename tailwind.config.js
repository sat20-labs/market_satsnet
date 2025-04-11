import { nextui } from '@nextui-org/react';

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './styles/**/*.css',
    './node_modules/@nextui-org/theme/dist/**/*.{js,ts,jsx,tsx}',
    './node_modules/@nextui-org/react/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      screens: {
        '3xl': '1920px',
        '4xl': '2048px',
      },
      backdropOpacity: {
        15: '.15',
      },
    },
    safelist: [
      {
        pattern: /data-\[hover=true\]:(bg|border|text)-(purple|blue|red|green|yellow)-(100|200|300|400|500|600|700|800|900)/,
      },
      {
        pattern: /data-\[disabled=true\]:(bg|border|text)-(gray|purple|blue|red|green|yellow)-(100|200|300|400|500|600|700|800|900)/,
      },
      {
        pattern: /bg-gradient-to-r/,
      },
      {
        pattern: /from-\[#8000cc\]/,
      },
      {
        pattern: /to-\[#a0076d\]/,
      },
      {
        pattern: /hover:from-\[#a0076d\]/,
      },
      {
        pattern: /hover:to-\[#8000cc\]/,
      },
    ],
  },
  darkMode: 'class',
  plugins: [nextui()],
};