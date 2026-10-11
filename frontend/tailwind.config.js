export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#142b39',
        muted: '#71818a',
        canvas: '#f6f8f8',
        line: '#e7edee',
        teal: { 50: '#edf9f6', 100: '#d7f1e9', 500: '#189982', 600: '#11826d', 700: '#0b6858' },
      },
      fontFamily: { sans: ['Inter', 'Segoe UI', 'Arial', 'sans-serif'] },
      boxShadow: { soft: '0 3px 18px -9px rgba(20,43,57,.10)' },
    },
  },
  plugins: [],
};
