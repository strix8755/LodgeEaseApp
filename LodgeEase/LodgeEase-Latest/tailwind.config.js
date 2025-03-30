/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./ClientSide/**/*.{html,js}",
    "./AdminSide/**/*.{html,js}",
    './Dashboard/**/*.{html,js}',
    './Room Management/**/*.{html,js}',
    './Requests/**/*.{html,js}',
    './Billing/**/*.{html,js}',
    './Reports/**/*.{html,js}',
    './BusinessAnalytics/**/*.{html,js}',
    './ActivityLog/**/*.{html,js}',
    './Settings/**/*.{html,js}',
    './AInalysis/**/*.{html,js}'
  ],
  theme: {
    extend: {},
  },
  plugins: [],
  output: './dist'  // Properly defined output directory
}
