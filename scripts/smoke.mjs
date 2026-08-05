import { chromium } from 'playwright'

const BASE = process.env.BASE ?? 'http://localhost:5173'
const HERO = 'op_midwest_plant3'

const ROUTES = [
  '/',
  '/sales',
  '/site-visits',
  '/estimates',
  '/proposals',
  '/jobs',
  '/catalog',
  '/purchasing',
  '/customers',
  '/finance',
  '/reports',
  '/settings',
  '/intake',
  '/schedule',
  '/field',
  // legacy redirects
  '/pipeline',
  '/projects',
  '/accounts',
  '/accounting',
  '/materials',
  `/opportunities/${HERO}/visit`,
  `/estimate/${HERO}`,
  `/opportunities/${HERO}`,
  `/opportunities/${HERO}/purchasing`,
  '/opportunities/op_chi_followup',
  '/opportunities/op_den_delayed',
  '/opportunities/op_atl_paid',
  '/opportunities/op_chi_completion',
  '/opportunities/op_midwest_plant2',
  '/field/visit/op_hartley_hvac',
  '/field/job/op_midwest_plant2',
  '/field/job/op_den_ready',
  '/proposal/qd7w1z',
  '/signoff/op_chi_completion',
]

const browser = await chromium.launch()
const page = await browser.newPage()
const errors = []
page.on('pageerror', (e) => errors.push(String(e)))
page.on('console', (m) => {
  if (m.type() === 'error') errors.push(m.text())
})

for (const route of ROUTES) {
  const res = await page.goto(`${BASE}${route}`, { waitUntil: 'networkidle' })
  const landed = new URL(page.url()).pathname + (new URL(page.url()).search || '')
  const status = res?.status() ?? 0
  if (status >= 400) errors.push(`${route} → HTTP ${status}`)
  // Allow known redirects
  const redirected =
    (route === '/pipeline' && landed.startsWith('/sales')) ||
    (route === '/projects' && landed.startsWith('/jobs')) ||
    (route === '/accounts' && landed.startsWith('/customers')) ||
    (route === '/accounting' && landed.startsWith('/finance'))
  if (!redirected && !landed.startsWith(route.split('?')[0]) && route !== '/') {
    // soft check — pathname prefix
    const base = route.split('?')[0]
    if (!new URL(page.url()).pathname.startsWith(base) && new URL(page.url()).pathname !== base) {
      errors.push(`${route} redirected unexpectedly to ${page.url()}`)
    }
  }
  console.log('ok  ', route)
}

await browser.close()
console.log(errors.length ? `\n${errors.length} issue(s)` : '\nall routes clean')
for (const e of [...new Set(errors)]) console.log(' ', e.slice(0, 200))
process.exit(errors.length ? 1 : 0)
