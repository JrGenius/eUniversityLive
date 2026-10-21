/** Les couleurs viennent des variables CSS de src/index.css (thème centralisé). */
const c = (n) => `rgb(var(--${n}) / <alpha-value>)`
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: c('brand'), 'brand-dark': c('brand-dark'), 'brand-soft': c('brand-soft'),
        ink: c('ink'), 'ink-soft': c('ink-soft'), paper: c('paper'), card: c('card'), line: c('line'),
        ok: c('ok'), bad: c('bad'),
        'ans-a': c('ans-a'), 'ans-b': c('ans-b'), 'ans-c': c('ans-c'), 'ans-d': c('ans-d'),
      },
      fontFamily: { sans: ['"Inter"', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'] },
      keyframes: {
        pop: { '0%': { transform: 'scale(.9)', opacity: '0' }, '100%': { transform: 'scale(1)', opacity: '1' } },
        rise: { '0%': { transform: 'translateY(8px)', opacity: '0' }, '100%': { transform: 'translateY(0)', opacity: '1' } },
      },
      animation: { pop: 'pop .25s ease-out both', rise: 'rise .3s ease-out both' },
    },
  },
}
