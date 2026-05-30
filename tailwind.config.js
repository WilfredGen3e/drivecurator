/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        fluent: {
          accent:          '#0078d4',
          'accent-hover':  '#106ebe',
          'accent-light':  '#deecf9',
          'bg-primary':    '#ffffff',
          'bg-secondary':  '#f5f5f5',
          'bg-hover':      '#edebe9',
          'bg-selected':   '#deecf9',
          'text-primary':  '#201f1e',
          'text-secondary':'#605e5c',
          'text-disabled': '#a19f9d',
          border:          '#edebe9',
          'border-strong': '#c8c6c4',
          danger:          '#d13438',
          'danger-light':  '#fde7e9',
          success:         '#107c10',
          'success-light': '#dff6dd',
        },
      },
      fontFamily: {
        sans: ["'Segoe UI'", 'system-ui', '-apple-system', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
