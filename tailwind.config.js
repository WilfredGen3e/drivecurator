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
          'danger-hover':  'var(--color-danger-hover)',
          'danger-light':  'var(--color-danger-light)',
          success:         'var(--color-success)',
          'success-light': 'var(--color-success-light)',
          canvas:          'var(--color-canvas)',
          stage:           'var(--color-stage)',
          'stage-elevated':'var(--color-stage-elevated)',
          folder:          'var(--color-folder)',
          'folder-strong': 'var(--color-folder-strong)',
        },
      },
      fontFamily: {
        sans: [
          '-apple-system', 'BlinkMacSystemFont', "'SF Pro Text'", "'SF Pro Display'",
          'system-ui', "'Segoe UI'", 'Roboto', 'sans-serif',
        ],
      },
      borderRadius: {
        // Apple-achtige afronding: knoppen 12px, kaarten 16px, sheets 22px
        DEFAULT: '8px',
        lg: '10px',
        xl: '12px',
        '2xl': '16px',
        '3xl': '22px',
      },
      boxShadow: {
        card:  'var(--shadow-card)',
        float: 'var(--shadow-float)',
      },
    },
  },
  plugins: [],
}
