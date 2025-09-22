import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        lane1: '#60a5fa',
        lane2: '#34d399',
        lane3: '#fbbf24',
        lane4: '#f87171'
      }
    }
  },
  plugins: []
} satisfies Config;
