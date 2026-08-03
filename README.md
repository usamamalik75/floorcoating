# Service Operations Platform — Prototype

A clickable prototype of a configurable CRM-to-field-service platform for
quote-driven service businesses.

The product closes the operational gap between a CRM such as HubSpot and a
field-service product such as Housecall Pro. A customer and their work stay in
one connected system from first enquiry through completed and paid job.

> One customer record. One sold scope. One operational history.

This repository uses mock data and browser-session persistence. It has no
backend, authentication, or live third-party integrations.

```bash
npm install
npm run dev
```

## Product boundary

The platform does not generate leads. Leads may arrive from External provider, forms,
advertising, referrals, imports, webhooks, or any other provider. Their source
is metadata; the product begins when a person or system creates an enquiry.

The platform owns the connected workflow:

```text
Customer → Opportunity → Assessment → Quote → Proposal
         → Sold scope → Job → Schedule → Field work
         → Change orders → Completion → Invoice → Payment
```

It does not include franchise management. Multiple locations can share a
workspace, but they are ordinary business units within one company.

## General product, configurable trades

The core model is industry-neutral:

- Customers, contacts, and service locations
- Opportunities and pipeline stages
- Assessments, forms, files, and photos
- Products, services, pricing, resource requirements, and quote options
- Proposals, approvals, and signatures
- Jobs, schedules, teams, and responsibilities
- Checklists, issues, change orders, and completion
- Invoices, payments, activity, and reporting

Trade-specific behavior belongs to workspace configuration: custom fields,
forms, catalogue items, pricing rules, terminology, checklists, documents, and
workflow gates.

The current seed data is a multi-service demonstration template. It
is an example configuration, not the product's permanent domain model. The
template boundary is defined in `src/config/workspace.ts`.

## Pipeline as the control plane

A pipeline transition causes work. It can validate record readiness, request
approval, assign responsibility, create a checklist, set a reminder, attach a
document, create a job, or notify a team member.

Stage definitions live in `src/domain/stages.ts`, while record-backed gate
checks live in `src/domain/readiness.ts`. A required condition is evaluated
from the underlying record instead of being bypassed with a manual checkbox.

## Flexible job teams

A job is not limited to one project manager and one crew. It supports any
number of assignments using explicit per-job responsibilities:

- Sales owner
- Estimator
- Project manager
- Scheduler
- Field supervisor
- Crew lead
- Technician
- Quality reviewer
- Billing owner

One person can hold several responsibilities on a job, and several people can
share the same responsibility. The model is in `src/domain/types.ts`; the team
editor is available from the Schedule job drawer.

## Primary roles

- Platform administrator
- Business owner
- Sales representative
- Estimator
- Project manager
- Crew leader
- Field technician
- Accounting

Roles control the user's workspace lens. Job responsibilities separately
describe what each person owns on a particular job.

## Prototype routes

- Dashboard
- Sales pipeline
- Assessments
- Quotes and proposals
- Jobs and scheduling
- Products and services catalogue
- Purchasing and fulfilment
- Customers
- Field workspace
- Finance and reports
- Workspace settings
- Customer proposal and completion links

## Technology

- React 19 and TypeScript
- React Router
- Zustand session-persisted state
- Tailwind CSS design tokens
- Vite
- Playwright walkthrough and smoke scripts

```bash
npm run typecheck
npm run build
node scripts/smoke.mjs
node scripts/journey.mjs
```

## Production work still required

- Backend, authentication, tenant isolation, and permissions
- Immutable audit and signed-scope versioning
- Email, SMS, accounting, payment, calendar, and file integrations
- Multiple contacts and service locations per customer
- Configurable field, form, workflow, and document builders
- Crew capacity, equipment, dependency, and availability planning
- Estimated-versus-actual labor, material, and job profitability
- Offline field operation and reliable synchronization
- Import, deduplication, integration retries, and reconciliation
