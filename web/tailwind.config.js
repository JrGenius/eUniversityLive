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
        draw: { '0%': { strokeDashoffset: '24' }, '100%': { strokeDashoffset: '0' } },
        breathe: { '0%,100%': { transform: 'scale(.7)', opacity: '.35' }, '50%': { transform: 'scale(1)', opacity: '1' } },
        float: { '0%,100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-8px)' } },
      },
      animation: { pop: 'pop .25s ease-out both', rise: 'rise .3s ease-out both', draw: 'draw .4s .1s ease-out both', breathe: 'breathe 1.4s ease-in-out infinite', float: 'float 4s ease-in-out infinite' },
    },
  },
}
