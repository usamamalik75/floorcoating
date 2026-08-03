import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'

const BASE = process.env.BASE ?? 'http://localhost:5173'
const OUT = 'screenshots'
mkdirSync(OUT, { recursive: true })

const browser = await chromium.launch()
const page = await browser.newPage({ deviceScaleFactor: 2 })

const HERO = 'op_midwest_plant3'

async function shot(name, path, w = 1600, h = 950) {
  await page.setViewportSize({ width: w, height: h })
  await page.goto(`${BASE}${path}`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(600)
  await page.screenshot({ path: `${OUT}/${name}.png` })
  console.log('captured', name)
}

/* -- Desktop: the operations platform ----------------------------------- */
await shot('01-dashboard', '/')
await shot('02-sales', '/sales')
await shot('03-jobs', '/jobs')
await shot('05-intake', '/intake')
await shot('06-record', `/opportunities/${HERO}`)
await shot('07-estimate', `/estimate/${HERO}`)
await shot('08-purchasing', `/opportunities/${HERO}/purchasing`)
await shot('09-site-visits', '/site-visits')
await shot('09b-estimates', '/estimates')
await shot('09c-proposals', '/proposals')
await shot('10-schedule', '/schedule')
await shot('11-finance', '/finance')

/* -- Desktop: purchasing and fulfilment --------------------------------- */

/* -- External customer experience --------------------------------------- */
await shot('16-customer-proposal', '/proposal/qd7w1z', 1200, 1250)
await shot('17-customer-signoff', '/signoff/op_chi_completion', 1200, 950)

/* -- Mobile / tablet ----------------------------------------------------- */
await shot('18-field-today', '/field', 430, 932)
await shot('19-field-visit', `/field/visit/${HERO}`, 430, 1250)
await shot('20-field-job', '/field/job/op_midwest_plant2', 430, 1400)
await shot('21-site-visit-form', `/opportunities/${HERO}/visit`, 430, 1250)

/* -- The blocking gates: the most important interactions ----------------- */
await page.setViewportSize({ width: 1600, height: 1000 })

// Delayed requires a reason, a period and a follow-up date before it commits.
await page.goto(`${BASE}/opportunities/op_chi_followup`, { waitUntil: 'networkidle' })
await page.getByRole('button', { name: 'Project Delayed', exact: true }).click()
await page.waitForTimeout(600)
await page.screenshot({ path: `${OUT}/22-gate-delayed.png` })
console.log('captured 22-gate-delayed')

// Readiness gate: the estimate cannot go to approval with missing inputs.
await page.goto(`${BASE}/opportunities/op_den_qualified`, { waitUntil: 'networkidle' })
await page.getByRole('button', { name: 'Estimate Ready', exact: true }).click()
await page.waitForTimeout(600)
await page.screenshot({ path: `${OUT}/23-gate-readiness.png` })
console.log('captured 23-gate-readiness')

/* -- Dark mode ----------------------------------------------------------- */
await page.goto(`${BASE}/sales`, { waitUntil: 'networkidle' })
await page.evaluate(() => document.documentElement.classList.add('dark'))
await page.waitForTimeout(400)
await page.screenshot({ path: `${OUT}/24-sales-dark.png` })
console.log('captured 24-sales-dark')

await browser.close()
