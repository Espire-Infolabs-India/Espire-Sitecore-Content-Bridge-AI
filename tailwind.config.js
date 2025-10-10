/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',   // App Router files
    './src/components/**/*.{js,ts,jsx,tsx,mdx}', // Components
    './src/pages/**/*.{js,ts,jsx,tsx}',      // Optional: pages folder if exists
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};
