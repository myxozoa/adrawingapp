/** @type {import('tailwindcss').Config} */
/*eslint-env node*/

export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    require("tailwindcss-radix")(),
  ],
}
