import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        gam: {
          blue: '#0F183E',
          orange: '#FF4F1A',
          peach: '#FF9A78',
          sky: '#D7E4F4',
          night: '#151515',
          gray: '#E6E6E6',
        },
      },
      boxShadow: {
        glow: '0 0 0 1px rgba(255,255,255,0.04), 0 12px 32px rgba(0,0,0,0.28)',
      },
    },
  },
  plugins: [],
};

export default config;
