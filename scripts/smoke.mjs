import { chromium } from 'playwright'

const BASE = process.env.BASE ?? 'http://localhost:5173'
const HERO = 'op_midwest_plant3'

const ROUTES = [
  '/',
  '/pipeline?scope=sales',
  '/pipeline?scope=operations',
  '/pipeline?scope=all',
  '/accounts',
  '/prospecting',
  '/intake',
  '/projects',
  '/schedule',
  '/accounting',
  '/admin',
  '/styleguide',
  '/fms/catalogue',
  '/fms/orders',
  '/fms/locations',
  '/field',
  `/opportunities/${HERO}/visit`,
  `/estimate/${HERO}`,
  `/opportunities/${HERO}`,
  `/opportunities/${HERO}/material`,
  '/opportunities/op_chi_followup',
  '/opportunities/op_den_delayed',
  '/opportunities/op_atl_paid',
  '/opportunities/op_chi_completion',
  '/opportunities/op_midwest_plant2',
  '/opportunities/op_verano_garage',
  '/opportunities/op_southline_bottling',
  '/field/visit/op_hartley_garage',
  '/field/job/op_midwest_plant2',
  '/field/job/op_den_ready',
  '/proposal/qd7w1z',
  '/signoff/op_chi_completion',
]

const browser = await chromium.launch()
const page = await browser.newPage()
let failures = 0

for (const route of ROUTES) {
  const errors = []
  const onError = (e) => errors.push(e.message)
  const onConsole = (m) => {
    if (m.type() === 'error') errors.push(m.text())
  }
  page.on('pageerror', onError)
  page.on('console', onConsole)

  await page.goto(`${BASE}${route}`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(350)

  page.off('pageerror', onError)
  page.off('console', onConsole)

  // A route that quietly falls through to the catch-all looks fine but is a
  // dead link, so treat the redirect as a failure.
  const landed = new URL(page.url()).pathname + new URL(page.url()).search
  if (landed !== route && route !== '/') errors.push(`redirected to ${landed}`)

  if (errors.length) {
    failures++
    console.log(`FAIL ${route}`)
    for (const e of [...new Set(errors)].slice(0, 2)) console.log(`     ${e.slice(0, 180)}`)
  } else {
    console.log(`ok   ${route}`)
  }
}

console.log(failures ? `\n${failures} route(s) with errors` : '\nall routes clean')
await browser.close()
process.exit(failures ? 1 : 0)
