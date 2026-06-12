/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        fluent: {
          accent:          'var(--color-accent)',
          'accent-hover':  'var(--color-accent-hover)',
          'accent-light':  'var(--color-accent-light)',
          'bg-primary':    'var(--color-bg-primary)',
          'bg-secondary':  'var(--color-bg-secondary)',
          'bg-hover':      'var(--color-bg-hover)',
          'bg-selected':   'var(--color-bg-selected)',
          'text-primary':  'var(--color-text-primary)',
          'text-secondary':'var(--color-text-secondary)',
          'text-disabled': 'var(--color-text-disabled)',
          border:          'var(--color-border)',
          'border-strong': 'var(--color-border-strong)',
          danger:          'var(--color-danger)',
          'danger-light':  'var(--color-danger-light)',
          success:         'var(--color-success)',
          'success-light': 'var(--color-success-light)',
        },
      },
      fontFamily: {
        sans: ["'Segoe UI'", 'system-ui', '-apple-system', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
