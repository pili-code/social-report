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
        brand: {
          dark: '#16213E',
          youtube: '#FF0000',
          instagram: '#E1306C',
          tiktok: '#000000',
          x: '#1DA1F2',
          linkedin: '#0077B5',
          meta: '#1877F2',
        }
      },
    },
  },
  plugins: [],
}
