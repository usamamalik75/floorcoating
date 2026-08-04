# FloorCoating UI Flow Document

This document lists the current user-facing flows available in the UI prototype.

## Navigation Structure

Internal users work from these main areas:

- `Dashboard`
- `Customers`
- `Prospecting`
- `Sales`
- `Communications`
- `Assessments`
- `Quotes`
- `Proposals`
- `Jobs`
- `Schedule`
- `Field Operations`
- `Procurement`
- `Catalogue`
- `Finance`
- `Reports`
- `Admin`
- `Settings`

Customer-facing routes live outside the internal shell:

- `Customer proposal`
- `Customer signoff`
- `Customer payment`

## Generic Product Language Map

Use these labels when speaking about the platform as a generic product:

- `Products & Services` -> `Catalogue`
- `Purchasing` -> `Procurement`
- `Site Visit` -> `Assessment`
- `Material Order` -> `Procurement Order`
- `Installer` -> `Technician`
- `Crew Leader` -> `Field Lead`
- `Proposal acceptance` -> `Customer approval`
- `Field execution` -> `Work delivery`

## 1. Platform Owner / Administrator Flows

### 1.1 Create a customer-first account

1. Platform owner goes to `Customers`.
2. Platform owner clicks `New customer`.
3. Platform owner fills company name, location, contact details, city/state, ZIP, and customer type.
4. Platform owner clicks `Create customer`.
5. The customer now appears in the customer workspace as an account-first record.

### 1.2 Create a lead-first customer

1. Platform owner goes to `Customers`.
2. Platform owner clicks `New lead / customer`.
3. Platform owner lands on the lead capture form.
4. Platform owner enters contact details, ZIP, project type, source, and project description.
5. The platform routes the record to a location from ZIP ownership.
6. The lead is created and can then be assigned to a sales rep.

### 1.3 Edit a customer

1. Platform owner goes to `Customers`.
2. Platform owner clicks `Edit` on a customer card.
3. Platform owner updates company or contact details.
4. Platform owner clicks `Update customer`.

### 1.4 Import prospects from a sheet

1. Platform owner goes to `Prospecting`.
2. Platform owner clicks `Import prospects`.
3. The import popup opens and shows the sheet source.
4. Platform owner chooses a default location and clicks `Import from sheet`.
5. The imported companies appear under `Imported prospects` as prospect accounts.

### 1.5 Add a location

1. Platform owner goes to `Admin`.
2. Platform owner opens the `Locations` builder.
3. Platform owner clicks `Add location`.
4. Platform owner enters location name, city, state, owner, opened date, ZIP prefixes, corporate flag, and price multiplier.
5. The location appears in the admin location list and in the demo location selector.

### 1.6 Add a team member

1. Platform owner goes to `Admin`.
2. Platform owner finds the `Team setup` section.
3. Platform owner clicks `New team member`.
4. Platform owner enters name, role, title, and location.
5. Platform owner clicks `Add team member`.
6. The team member appears in the territory staffing design list, the live demo user switcher, and assignment pickers that use the shared user directory.

### 1.7 Configure platform standards

1. Platform owner goes to `Admin`.
2. Platform owner opens the builders for `Proposal templates`, `Estimating packs`, `Assessment forms`, or `Checklists`. Locations are managed on the Admin Locations tab; catalogue items on Products & Services.
3. Edits persist in shared store state and show immediately on Estimates, Visits & Calls, stage gates, Field job sheets, proposals, procurement, and Settings.
3. Platform owner updates configuration values directly in the builder UI.

### 1.7a Configure an estimating pack

1. Platform owner goes to `Admin`.
2. Platform owner opens the `Estimating packs` builder.
3. Platform owner selects Residential, Commercial, or Industrial.
4. Platform owner edits pack name, deposit %, proposal template, default system, alternate systems, reminders, and form hints.
5. New estimates for that opportunity type use the updated pack.

### 1.8 Add a product or service

1. Platform owner goes to `Catalogue`.
2. Platform owner clicks `New product / service`.
3. Platform owner enters name, category, unit, price, market, and description.
4. Platform owner clicks `Create item`.
5. The item appears in the catalogue list and can be refined further from the admin builder.

## 2. Sales / Growth Flows

### 2.1 Pick up and qualify a new lead

1. Sales rep goes to `Sales`.
2. Sales rep clicks `New lead`, or opens an existing lead from the board.
3. Sales rep reviews the record and moves it through the stage flow.
4. Sales rep uses stage gates to assign ownership, set reminders, and advance qualification.

### 2.2 Work a pre-lead prospecting journey

1. Sales rep goes to `Prospecting`.
2. Sales rep clicks `Import prospects` to pull companies from the sheet when needed.
3. Sales rep reviews the imported prospect list and clicks `Create lead` to move a company into sales.

### 2.3 Start a customer conversation

1. Sales rep goes to `Communications`.
2. Sales rep clicks `Start conversation`.
3. Sales rep selects an opportunity without an existing thread.
4. The platform opens a draft conversation and pre-fills the first message.
5. Sales rep edits the message and clicks `Save draft` or `Send now`.

### 2.4 Follow up from the opportunity record

1. Sales rep opens an opportunity.
2. Sales rep goes to the messaging area for that record.
3. Sales rep drafts or sends the next customer touch.
4. The thread remains visible in both `Communications` and the opportunity-level journey.

## 3. Assessment / Quoting Flows

### 3.1 Start a new assessment

1. Sales rep or estimator goes to `Assessments`.
2. User clicks `New assessment`.
3. User selects the eligible opportunity.
4. The opportunity is moved into the assessment flow and opens in the visit context.

### 3.2 Complete the site visit form

1. Sales rep opens the opportunity Visits tab to review status, or opens the guided form at `/opportunities/:id/visit`.
2. Capture and edit happen only on the guided form (checklist, scope requests, answers).
3. Sales rep saves progress or completes the visit.
4. The Visits tab shows a read-only summary of what was gathered; the estimate journey uses that data.

### 3.3 Start a new estimate

1. Estimator goes to `Quotes`.
2. Estimator clicks `New estimate`.
3. Estimator selects an eligible opportunity.
4. The estimate builder opens for that opportunity.

### 3.4 Build and send a proposal

1. Estimator or sales rep goes to `Proposals`.
2. User clicks `New proposal`.
3. User selects an approved estimate.
4. The user opens the proposal send flow from the estimate builder.
5. The customer-facing proposal link can then be shared.

## 4. Delivery / Operations Flows

### 4.1 Create a manual job

1. Operations manager goes to `Jobs`.
2. Operations manager clicks `New job`.
3. Operations manager selects awarded work, start date, and duration.
4. Operations manager clicks `Create job`.
5. The new job is added to the jobs pipeline.

### 4.2 Advance job execution

1. Operations manager goes to `Jobs`.
2. Operations manager opens a job card or uses `Advance to ...`.
3. The job moves through scheduling, readiness, progress, review, invoicing, and paid states.

### 4.3 Schedule awarded work

1. Operations manager goes to `Schedule`.
2. Operations manager clicks `Schedule next job` or `Schedule` on unscheduled awarded work.
3. The scheduling sheet opens for team assignment, dispatch controls, and rescheduling.

### 4.4 Prepare a procurement order

1. Operations manager goes to `Procurement`.
2. Operations manager clicks `Prepare order`.
3. Operations manager selects the job needing procurement.
4. The procurement-order screen opens with the derived resource lines.
5. Operations manager creates the order and moves it into fulfilment.

### 4.5 Run field execution

1. Crew lead or technician goes to `Field Operations`.
2. User opens today’s visit or job.
3. User clocks travel/on-site/wrap states, records daily updates, and completes mobile work tasks.

## 5. Revenue / Accounting Flows

### 5.1 Raise a queue-based invoice

1. Accounting user goes to `Finance`.
2. Accounting user clicks `New invoice` or acts from the `Waiting on accounting` queue.
3. Accounting user raises an interim or final invoice for eligible work.

### 5.2 Create a manual invoice

1. Accounting user goes to `Finance`.
2. Accounting user clicks `Manual invoice`.
3. Accounting user selects an opportunity, invoice type, and amount.
4. Accounting user clicks `Create invoice`.
5. The invoice is added to the finance ledger as a draft.

### 5.3 Collect payment

1. Accounting user goes to `Finance`.
2. Accounting user opens an invoice row.
3. Accounting user clicks `Record payment`, or `Send link`, or `Mark hosted paid`.
4. Payment status updates in the finance ledger and the opportunity journey.

## 6. Customer Self-Service Flows

### 6.1 Review and accept a proposal

1. Customer opens the public proposal link.
2. Customer reviews scope, pricing, and proposal terms.
3. Customer signs or accepts the proposal through the customer-facing screen.
4. The opportunity moves into awarded work and downstream delivery.

### 6.2 Complete signoff

1. Customer opens the signoff route when prompted.
2. Customer reviews the closeout confirmation.
3. Customer signs the record.

### 6.3 Pay through the hosted payment page

1. Customer opens the hosted payment link.
2. Customer reviews the amount and payment timeline.
3. Customer completes the simulated payment action.
4. The payment status updates in the internal finance workflow.

## 7. End-to-End Core Flow

This is the main flow the prototype currently supports:

1. Platform owner goes to `Customers` and clicks `New customer`, or clicks `New lead / customer`.
2. Sales rep goes to `Sales` and qualifies the lead.
3. Sales rep or branch owner goes to `Communications` and starts the first thread if needed.
4. Sales rep goes to `Assessments` and starts the site visit.
5. Estimator goes to `Quotes` and creates the estimate.
6. Estimator or sales rep goes to `Proposals` and prepares the customer proposal.
7. Customer opens the public proposal link and accepts the work.
8. Operations manager goes to `Jobs` or `Schedule` and creates / schedules the delivery record.
9. Operations manager goes to `Procurement` and prepares resource orders if needed.
10. Field team goes to `Field Operations` and executes the work.
11. Accounting goes to `Finance`, raises the invoice, sends the payment link, and records payment.

## 8. Role-Wise Page Map

This section explains each page by role: who uses it, why they open it, and what they do next.

### 8.1 `Dashboard`

- **Primary roles:** admin, owner, sales, estimator, PM, accounting. Crew leader and technician are redirected into `Field Operations`.
- **Journey:** the user lands here first, reviews work queues, and clicks into the next operational page that needs attention.

### 8.2 `Sales`

- **Primary roles:** admin, owner, sales, estimator, PM, accounting.
- **Journey:** sales rep goes to `Sales`, clicks `New lead` or opens a board card, then qualifies and advances the opportunity.

### 8.3 `Prospecting`

- **Primary roles:** admin, owner, sales.
- **Journey:** platform owner or sales user goes to `Prospecting`, clicks `Import prospects`, confirms the sheet import, reviews imported companies, then clicks `Create lead` to push a prospect into the sales flow.

### 8.4 `Customers`

- **Primary roles:** admin, owner, sales, estimator, PM, accounting.
- **Journey:** platform owner goes to `Customers`, clicks `New customer` for an account-first journey, or clicks `New lead / customer` for a lead-first journey, then edits customer details from the same workspace.

### 8.5 `Lead Intake`

- **Primary roles:** admin, owner, sales.
- **Journey:** platform owner or sales user goes to `Lead Intake`, fills the inbound request form, lets the platform route by ZIP, and assigns the lead after creation.

### 8.6 `Communications`

- **Primary roles:** admin, owner, sales, estimator, PM, accounting.
- **Journey:** sales rep or coordinator goes to `Communications`, clicks `Start conversation`, drafts the first message, and keeps follow-up threads tied to the opportunity.

### 8.7 `Assessments`

- **Primary roles:** admin, owner, sales, estimator, PM, accounting, crew leader.
- **Journey:** sales rep or estimator goes to `Assessments`, clicks `New assessment`, selects the eligible opportunity, and opens the site visit flow.

### 8.8 `Site Visit`

- **Primary roles:** sales, estimator, PM, crew leader.
- **Journey:** the user opens a specific visit, captures site data, saves progress, and completes the record so quoting can continue.

### 8.9 `Quotes`

- **Primary roles:** admin, owner, sales, estimator, PM.
- **Journey:** estimator goes to `Quotes`, clicks `New estimate`, selects an opportunity, and opens the estimate builder.

### 8.10 `Estimate Builder`

- **Primary roles:** sales, estimator, PM.
- **Journey:** estimator builds scope, pricing, and proposal content, then hands the opportunity into proposal review/send.

### 8.11 `Proposals`

- **Primary roles:** admin, owner, sales, estimator.
- **Journey:** estimator or sales rep goes to `Proposals`, clicks `New proposal`, opens the approved estimate, and sends the customer-facing document.

### 8.12 `Jobs`

- **Primary roles:** admin, owner, PM, estimator, crew leader, accounting.
- **Journey:** operations manager goes to `Jobs`, clicks `New job` for awarded work if needed, then advances the job through delivery states.

### 8.13 `Schedule`

- **Primary roles:** admin, owner, sales, estimator, PM, accounting, crew leader.
- **Journey:** operations manager goes to `Schedule`, clicks `Schedule next job` or `Schedule`, assigns the team, and manages rescheduling and dispatch readiness.

### 8.14 `Procurement`

- **Primary roles:** admin, owner, PM, accounting.
- **Journey:** operations manager goes to `Procurement`, clicks `Prepare order`, opens the derived resource list, and moves the order through fulfilment.

### 8.15 `Field Operations`

- **Primary roles:** crew leader, technician.
- **Journey:** field user goes to `Field Operations`, opens today’s visit or job, clocks activity, updates execution, and completes mobile-first work tasks.

### 8.16 `Catalogue`

- **Primary roles:** admin, owner, sales, estimator, PM, accounting.
- **Journey:** platform owner or estimator goes to `Catalogue`, clicks `New product / service`, and extends the catalogue used by quoting and delivery.

### 8.17 `Finance`

- **Primary roles:** admin, owner, accounting, PM.
- **Journey:** accounting goes to `Finance`, raises queue-based invoices, creates manual invoices, sends payment links, and records payments.

### 8.18 `Reports`

- **Primary roles:** admin, owner.
- **Journey:** platform owner goes to `Reports` to review company performance, location performance, job counts, and collection metrics. This is intentionally read-only.

### 8.19 `Settings`

- **Primary roles:** admin, owner.
- **Journey:** platform owner goes to `Settings` to jump into admin builder, communications, or finance setup surfaces.

### 8.20 `Admin`

- **Primary roles:** admin, owner.
- **Journey:** platform owner goes to `Admin`, uses `Team` to add people, `Locations` to review routing, and `Setup` to open one company configuration area at a time.

### 8.21 `Opportunity Record`

- **Primary roles:** depends on the user’s function.
- **Journey:** the user opens an opportunity from any list page and uses it as the central record hub for visits, messages, quotes, jobs, procurement, and invoicing context.

### 8.22 `Procurement Order`

- **Primary roles:** PM, admin, owner, accounting.
- **Journey:** the user opens the job-specific procurement record, reviews derived resource lines, creates the order, and advances the fulfilment tracker.

### 8.23 `Customer Proposal`

- **Primary roles:** external customer.
- **Journey:** customer opens the shared proposal link, reviews pricing and terms, and accepts the proposal.

### 8.24 `Customer Signoff`

- **Primary roles:** external customer.
- **Journey:** customer opens the signoff page and confirms the closeout.

### 8.25 `Customer Payment`

- **Primary roles:** external customer.
- **Journey:** customer opens the hosted payment page and completes the payment step from the invoice request.

## 9. Design Notes

- The main journeys in this prototype are now backed by shared store state, including team setup, sheet-based prospect imports, procurement orders, communications, payment links, and location-driven routing.
- A few integrations are still mocked even though the workflow state persists in-app:
  - external prospect-data providers
  - identity / authentication systems
  - hosted payment processors and accounting syncs
- Reporting pages remain intentionally read-only.

