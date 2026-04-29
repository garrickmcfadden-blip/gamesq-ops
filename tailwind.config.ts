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
        glow: '0 0 0 1px rgba(215,228,244,0.08), 0 18px 42px rgba(0,0,0,0.34), 0 0 36px rgba(255,79,26,0.06)',
      },
    },
  },
  plugins: [],
};

export default config;
