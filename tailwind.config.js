/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
      "./pages/**/*.{js,ts,jsx,tsx}",
      "./components/**/*.{js,ts,jsx,tsx}",
      "./app/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
      extend: {
        colors: {
          primary: "#FF5864",
          secondary: "#424242",
          accent: "#FE3C72",
        },
        padding: {
          '1': '0.25rem',
          '2': '0.5rem',
          '3': '0.75rem',
          '4': '1rem',
          '5': '1.25rem',
          '6': '1.5rem',
          '8': '2rem',
          '10': '2.5rem',
          '12': '3rem',
        },
        margin: {
          '1': '0.25rem',
          '2': '0.5rem',
          '3': '0.75rem',
          '4': '1rem',
          '5': '1.25rem',
          '6': '1.5rem',
          '8': '2rem',
          '10': '2.5rem',
          '12': '3rem',
        },
        borderRadius: {
          'md': '0.375rem',
          'lg': '0.5rem',
          'xl': '0.75rem',
          '2xl': '1rem',
          '3xl': '1.5rem',
          'full': '9999px',
        },
      },
    },
    plugins: [],
  };