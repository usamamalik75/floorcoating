import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Route } from 'lucide-react'
import { Button, Modal } from '@/components/ui'

const STEPS: { to: string; title: string; body: string }[] = [
  {
    to: '/sales',
    title: 'Sales pipeline — modules, not stages, in the menu',
    body: 'The left nav is business modules. Sales holds the lead-to-award board. Visits & Calls, Estimates and Proposals are separate modules that the pipeline creates and links to.',
  },
  {
    to: '/sales',
    title: 'Drag a card to Project Delayed',
    body: 'The gate cannot be dismissed until a reason, period and follow-up date are set. Temperature (Hot / Warm / Cold) is a field on the card — not a stage.',
  },
  {
    to: '/opportunities/op_midwest_plant3',
    title: 'Opportunity as the hub',
    body: 'Tabs for Overview, Site Visit (or Sales Call on residential), Estimates, Proposals and Job. Same record from the pipeline, module lists, or dashboard — no hunting across menus.',
  },
  {
    to: '/estimate/op_midwest_plant3',
    title: 'Estimate off the price book',
    body: 'Detailed work lives in Estimates. Approving moves the opportunity to Estimate Ready and offers Generate Proposal — without auto-redirecting you.',
  },
  {
    to: '/proposal/qd7w1z',
    title: 'Customer accepts the proposal',
    body: 'Signing awards the opportunity and creates a Job at Scheduling Required. Operational progress then lives on the Job pipeline.',
  },
  {
    to: '/jobs',
    title: 'Job pipeline',
    body: 'Awarded through Paid — separate from Sales so twenty stages never sit on one board.',
  },
  {
    to: '/field',
    title: 'Field density',
    body: 'Crew leaders land in Field. Same components, larger touch targets.',
  },
  {
    to: '/settings',
    title: 'Administrator lens',
    body: 'Company-wide pipeline, standards, teams, and operating controls.',
  },
]

export function DemoPath() {
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState(0)
  const s = STEPS[step]

  return (
    <>
      <Button size="sm" icon={<Route size={13} />} onClick={() => setOpen(true)}>
        Demo path
      </Button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        size="md"
        icon={<Route size={17} className="text-attention" />}
        title="Guided demo"
        subtitle="Modules for work. Pipelines for progress. One opportunity hub."
        footer={
          <>
            <span className="mr-auto font-mono text-sm tabular text-muted">
              {step + 1} / {STEPS.length}
            </span>
            <Button disabled={step === 0} onClick={() => setStep((n) => n - 1)}>
              Back
            </Button>
            <Link to={s.to} onClick={() => setOpen(false)}>
              <Button variant="primary" iconRight={<ArrowRight size={13} />}>
                Take me there
              </Button>
            </Link>
            <Button
              disabled={step === STEPS.length - 1}
              onClick={() => setStep((n) => n + 1)}
            >
              Next
            </Button>
          </>
        }
      >
        <p className="font-display text-lg text-primary">{s.title}</p>
        <p className="mt-2 text-base leading-relaxed text-secondary">{s.body}</p>
      </Modal>
    </>
  )
}
