# FCG Operations Platform — Prototype

A clickable, high-fidelity prototype of the Floor Coatings Group ecosystem: an **Operations
Platform** that replaces HubSpot, Housecall Pro, Google Sheets estimating, CompanyCam, Apollo and
Zapier with one continuous flow from prospect to paid, plus the **Franchise Management System** it
hands off to for product supply and franchise administration.

This is a **demo running on mock data**. There is no backend and no auth. State persists per browser
tab so a refresh or a link opened in a new tab does not lose the walkthrough; "Reset demo" in the top
bar returns to the start.

```bash
npm install
npm run dev      # http://localhost:5173
```

Reference screenshots of every screen live in [`screenshots/`](screenshots). With the dev server
running:

```bash
npx playwright install chromium   # first time only
node scripts/smoke.mjs            # every route renders with no runtime errors
node scripts/journey.mjs          # clicks the full demo scenario end to end
node scripts/shots.mjs            # regenerates the screenshot set
```

---

## The thesis

Everything here follows from one idea taken directly from discovery:

> **The pipeline is not a report. The pipeline is the control plane.**

Moving a record between stages is what *causes* work to happen — it fires checklists, reminders,
approvals, document attachment and notifications. That behaviour lives in one file,
[`src/domain/stages.ts`](src/domain/stages.ts), expressed as data. The board, the record page, the
stage-gate modal, the calendar and the franchisor rollup all read from it. **Adding or reordering a
stage is a data edit, not a code change.**

The second idea is structural. Discovery was explicit that the HubSpot contact/deal split is the
core frustration — *"I really don't want a contact spot and a deal spot."* So there is one spine:

```
Location → Account → Opportunity → { Estimate, Job, Material order, Invoice }
```

Prospect and Contact are **not separate tables**. They are the first two columns of the same board.

The third idea is that a gate should check the record, not a person's memory. Blocking transitions
are evaluated by [`src/domain/readiness.ts`](src/domain/readiness.ts) against real data — the site
visit form is complete, photos are attached, the estimate is priced, terms are selected. A failed
check links straight to the screen that fixes it. **These cannot be ticked off by hand.**

---

## The pipeline

Twenty-two stages across three phases, experienced as one journey. The board has a phase switcher so
the sales team and the operations team each see their own work; the record page always shows the
whole thing.

| Phase | Stages |
| --- | --- |
| Pre-pipeline | Prospects · Contacts / Accounts |
| Sales | Unqualified Lead · Qualified Lead · Site Visit Scheduled · Site Visit Completed · Estimating · Internal Approval · Proposal Delivered · Follow-up Required · Project Delayed · Awarded · Lost |
| Operations | Scheduling Required · Scheduled · Material Required · Ready for Installation · In Progress · Completion Review · Ready to Invoice · Invoiced · Paid and Closed |

Residential records relabel the visit stages to "Sales Call" automatically, because that is the
vocabulary the residential team actually uses.

---

## The demo scenario

A food-production facility submits a request for a new industrial floor. `scripts/journey.mjs`
clicks this path in full; the numbered screenshots land in `screenshots/journey/`.

1. **Lead capture** (`/intake`) — the public web form rendered inside the platform. Zip `60431`
   resolves to Chicago, the lead is created, and a rep is assigned. No Zapier, no re-keying.
2. **Guided site visit** (`/opportunities/:id/visit`) — the industrial field set on a phone:
   dimensions, cove, substrate, chemical exposure, temperature, shutdown windows, moisture testing,
   photos. Answers marked `estimate` write straight onto the estimate.
3. **Estimating** (`/estimate/:id`) — the AI takeoff reads 214 plan pages, identifies the 4 relevant
   sheets, extracts three areas and recommends a system. **A person accepts the measurements before
   anything is written.** The price book fills description, pricing, spec sheet, load list and
   exclusions.
4. **Internal approval** — the readiness panel verifies seven conditions. The proposal cannot be sent
   while any of them is missing.
5. **Proposal** (`/proposal/:token`) — the customer's secure link. Options, exclusions, terms,
   deposit, e-signature. Internal notes are absent by construction: the document component never
   receives them.
6. **Award** — signing moves the record to Awarded and straight on to Scheduling Required. Nobody
   drags a card to tell the business it won the job.
7. **Material** (`/opportunities/:id/material`) — quantities derived from the sold system, area,
   cove, coats and waste allowance, then submitted to the Franchise Management System, where the
   order appears with a link back to the project.
8. **Field** (`/field`) — the crew's job sheet: scope as sold, product specs, plans and installation
   map, checklist, before/progress/after photos, issue and change-order reporting.
9. **Closeout** (`/signoff/:id`) — the customer confirms completion *and* the additional work, which
   is what stops a change order being forgotten before invoicing.
10. **Accounting** (`/accounting`) — deposit, progress and final invoices, partial payments,
    QuickBooks references, outstanding balance, royalty accrual.

Two gates are worth clicking deliberately:

- **Project Delayed** demands a reason, an expected period and a mandatory follow-up date. A rep
  cannot park a six-figure bid without committing to chase it.
- **Internal Approval** on a thin record shows the readiness panel failing, each line linking to the
  screen that fixes it.

---

## Roles

One dataset, seven lenses. Switch with "Viewing as" in the top bar; franchise users are scoped to
their own territory automatically, and crew roles land in the field experience rather than a desktop
workspace they would never open.

| Role | Home |
| --- | --- |
| Franchisor | Network pipeline, royalty, territory performance, requests awaiting approval |
| Franchise owner | Location pipeline, team load, financial position |
| Sales representative | Today's appointments, new leads, proposals out, follow-ups due |
| Estimator / Head of Projects | Estimates to build, estimates awaiting approval |
| Project manager | Awarded but unscheduled, material to order, open issues, change orders |
| Crew leader / technician | Today on site, upcoming jobs, mobile job sheet |
| Accounting | Ready to invoice, change orders to confirm, outstanding balance |

---

## Two products, one ecosystem

The brief asked for one ecosystem without one enormous interface. The shell carries both products
with shared authentication, branding and navigation:

- **Operations Platform** — accounts and prospects, pipeline, site visits, estimating, proposals,
  scheduling, projects, field operations, accounting status.
- **Franchise Management System** — product catalogue, material order fulfilment, locations,
  agreements, royalties and compliance.

They overlap exactly where discovery said they should: a material order is raised inside a project
and fulfilled in the FMS, and each side links to the other.

---

## Design system

Full living reference at **`/styleguide`** in the running app.

### Brand

The FCG logo mark is a single-colour glyph in **`#7E2F3F`** — verified by sampling logo pixels on
both floorcoatingsgroup.com and floorcoatingsfranchise.com, not eyeballed. Supporting neutrals
`#2F0910`, `#323A45` and `#A4ABAC` are lifted from the same sites, so the steel ramp is built by
interpolating through *their* greys rather than a generic slate that would fight the warm burgundy.

### The burgundy problem

Burgundy is dark and red-adjacent, which collides with two things a pipeline tool needs. Red already
means "lost" or "overdue," and burgundy is too low-luminance to mark an active stage. The palette
therefore splits three jobs across three visually separable colours:

| Colour | Token | Job |
| --- | --- | --- |
| Burgundy `#7E2F3F` | `--action-primary` | Identity and commitment — primary actions, brand chrome, the *Awarded* stage |
| Copper `#B4622A` | `--accent-attention` | Attention — active stage, next action, work in flight |
| Scarlet `#DC2626` | `--status-danger` | Failure — always paired with an icon, never colour alone |

Copper fails AA on white at small sizes (4.45:1), so `--accent-attention-text` resolves to
`--copper-700` (5.32:1) for any text use. Burgundy on white is 8.88:1 and clears AAA.

### Token layers

Defined in [`src/styles/tokens.css`](src/styles/tokens.css). Strictly ordered — **components may only
reference layers 2 and 3. No component in this codebase contains a hex value**, apart from the
customer-facing proposal and sign-off pages, which are deliberately outside the app's theming so they
read as a document rather than a screen.

- **Layer 1 — primitives.** Raw ramps with no meaning: `--burgundy-*`, `--copper-*`, `--steel-*`,
  spacing, radius, type, motion.
- **Layer 2 — semantic.** What the UI consumes: `--surface-*`, `--border-*`, `--text-*`,
  `--action-*`, `--status-*`. Dark mode re-maps this layer only, at runtime, with no rebuild and no
  `dark:` class on every element.
- **Layer 3 — domain.** The tokens unique to this product: **stage colour identity**, one triad per
  stage group, reused verbatim by the board column, card, badge, timeline and calendar. A colour
  always means the same thing.

Note that Tailwind v4 reads `bg-(--token)` as a variable and `bg-[--token]` as a raw arbitrary value
that silently produces nothing. Use the parenthesised form.

### Density

One switch, two ergonomics — toggle Desktop / Field in the top bar.

```
comfortable   32px rows, 30px controls   office, dense tables
field         48px rows, 44px touch      job site, gloves on
```

The `/field` routes are **not a second application.** They are the same components inside
`data-density="field"`.

---

## Architecture

```
src/
  styles/tokens.css        three-layer token system + Tailwind @theme binding
  domain/
    types.ts               the data spine
    stages.ts              the stage machine — the product thesis as data
    readiness.ts           programmatic gate checks, each with a link to its fix
  data/
    priceBook.ts           FCG's floor systems, coverage rates and material derivation
    siteVisitForms.ts      residential, commercial and industrial guided field sets
    checklists.ts          stage-fired checklist templates
    seed.ts                3 territories, 22 people, 12 accounts, 27 opportunities
  store/
    useStore.ts            zustand store, session-persisted; simulated identity
    selectors.ts           scoped reads and readiness inputs
  components/
    ui/                    primitives — build only against tokens
    domain/                StageGate, StageStepper, OpportunityCard, ProposalDocument
    layout/                AppShell, DemoBar, DemoPath, Logo
  routes/                  Dashboard, Pipeline, OpportunityRecord, SiteVisit,
                           EstimateBuilder, MaterialOrder, Schedule, Projects,
                           Accounting, Prospecting, LeadIntake, Admin, Fms,
                           Field, CustomerProposal, StyleGuide
scripts/
  smoke.mjs                every route renders, no console errors, no dead links
  journey.mjs              the demo scenario, clicked
  shots.mjs                screenshot set
```

### Notable decisions

- **The record page is one scroll, not tabs.** The complaint being answered is *"if I go and look for
  something in estimates, I don't see anything that happened after that."* Tabs reproduce exactly
  that failure.
- **`StageGate` is fully data-driven.** No stage is special-cased in the component. `blocking: true`
  removes the close affordance entirely.
- **Seeded data is derived, not typed in.** Material lines run through the same `deriveMaterial` the
  UI uses, sold jobs carry a generated estimate built from the price book, and invoice amounts are
  shares of that contract. A changed coverage rate cannot leave the demo contradicting itself.
- **`DemoBar` is the highest-value demo affordance.** One dataset, seven roles, three territories.

---

## Deliberately out of scope

- **Real integrations.** CompanyCam, Apollo and QuickBooks are represented as behaviour and
  metadata, not live connections. The AI takeoff is a scripted result over a real interaction — the
  point being demonstrated is that a person verifies it before it counts.
- **A customer mobile application.** Discovery was explicit that this is not a priority. Customers
  get two lightweight links: proposal acceptance and completion sign-off.
- Auth, a backend, real multi-tenancy, native mobile shells.
