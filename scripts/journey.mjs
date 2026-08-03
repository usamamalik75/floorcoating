import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'

/* ==========================================================================
   The demo scenario, clicked rather than described.
   ==========================================================================
   A food-production facility submits a request for a new industrial service area and
   the job is followed all the way to Paid and Closed. This runs the same path
   the client will click in the walkthrough, so a broken step is caught here
   rather than in the meeting.
   ========================================================================== */

const BASE = process.env.BASE ?? 'http://localhost:5173'
const OUT = 'screenshots/journey'
mkdirSync(OUT, { recursive: true })

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } })

const errors = []
page.on('pageerror', (e) => errors.push(e.message))

let step = 0
async function mark(name) {
  step++
  await page.screenshot({ path: `${OUT}/${String(step).padStart(2, '0')}-${name}.png` })
  console.log(`  ${String(step).padStart(2, '0')} ${name}`)
}

const go = (path) => page.goto(`${BASE}${path}`, { waitUntil: 'networkidle' })
const viewAs = (userId) => page.getByLabel('Viewing as').selectOption(userId)

/* -- 1. A lead arrives on the national website --------------------------- */
console.log('Lead capture')
await go('/intake')
const field = (label) => page.getByLabel(label, { exact: true })
await field('Company or name*').fill('Cascade Provisions')
await field('Contact name*').fill('Dale Munro')
await field('Email*').fill('dmunro@cascadeprovisions.com')
await field('Phone*').fill('(815) 555-0143')
await field('Zip code*').fill('60431')
await field('Estimated quantity').fill('7500')
await page.getByLabel(/^Project type/).selectOption('industrial')
await mark('intake-filled')
await page.getByRole('button', { name: 'Submit request' }).click()
await page.waitForTimeout(500)
await mark('intake-routed')

/* -- 2. The location assigns a representative ---------------------------- */
await page.getByLabel(/sales representative/i).selectOption('u_bj')
await page.getByRole('button', { name: /Assign and open record/i }).click()
await page.waitForTimeout(600)
await mark('new-lead-record')

/* -- 3. The hero record: site visit already captured --------------------- */
console.log('Site visit and estimating')
await go('/opportunities/op_midwest_plant3')
await mark('record-summary')

await go('/opportunities/op_midwest_plant3/visit')
await mark('guided-form')

/* -- 4. Estimating, with the document-assisted scope extraction on the table --------------------- */
await go('/estimate/op_midwest_plant3')
await mark('estimate')
await page.getByRole('button', { name: /Accept scope/i }).click()
await page.waitForTimeout(400)
await mark('scope-extraction-accepted')

/* -- 5. Internal approval before anything reaches the customer ----------- */
await page.getByRole('button', { name: /Request approval/i }).click()
await page.waitForTimeout(400)
await mark('approval-requested')

await viewAs('u_marcus')
await page.waitForTimeout(300)
await page.getByRole('button', { name: /Approve estimate/i }).click()
await page.waitForTimeout(400)
await mark('estimate-approved')

/* -- 6. The customer reviews and signs ----------------------------------- */
console.log('Proposal and signature')
await go('/proposal/p3x8k2')
await mark('customer-proposal')
await page.getByRole('button', { name: /Review and sign/i }).click()
await page.getByLabel(/type your full legal name/i).fill('Gary Holcomb')
await page.getByRole('button', { name: /Accept and sign/i }).click()
await page.waitForTimeout(500)
await mark('customer-signed')

/* -- 7. Operations picks it up ------------------------------------------- */
console.log('Scheduling, material, field')
await go('/opportunities/op_midwest_plant3')
await mark('awarded-record')

await go('/opportunities/op_midwest_plant3/purchasing')
await page.getByRole('button', { name: /Create order/i }).click()
await page.waitForTimeout(400)
await page.getByRole('button', { name: /Submit to purchasing/i }).click()
await page.waitForTimeout(400)
await mark('material-submitted')

await go('/purchasing')
await mark('purchasing-received')

/* -- 8. The crew on site -------------------------------------------------- */
await page.setViewportSize({ width: 430, height: 932 })
await viewAs('u_keith')
await go('/field')
await mark('field-today')
await go('/field/job/op_midwest_plant2')
await mark('field-job')

/* -- 9. Closeout and money ------------------------------------------------ */
await page.setViewportSize({ width: 1600, height: 1000 })
console.log('Closeout and invoicing')
await go('/signoff/op_chi_completion')
await page.getByLabel(/type your full name/i).fill('Mark Hartley')
await page.getByRole('button', { name: /Sign off/i }).click()
await page.waitForTimeout(400)
await mark('customer-signoff')

await go('/finance')
await viewAs('u_gina')
await page.waitForTimeout(300)
await mark('accounting')

console.log(errors.length ? `\n${errors.length} runtime error(s):` : '\nno runtime errors')
for (const e of [...new Set(errors)]) console.log(`  ${e.slice(0, 200)}`)

await browser.close()
process.exit(errors.length ? 1 : 0)
