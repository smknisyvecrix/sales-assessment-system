/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#172026',
        muted: '#5f6b75',
        line: '#d8dee4',
        paper: '#f7f9fb',
        focus: '#1d7a8c',
        accent: '#c7522a'
      }
    }
  },
  plugins: []
};
