import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Route } from 'lucide-react'
import { Button, Modal } from '@/components/ui'

const STEPS: { to: string; title: string; body: string }[] = [
  {
    to: '/pipeline',
    title: 'One board, prospects included',
    body: 'Prospect and Contact are anchor columns holding Accounts — not a separate contacts database. Everything from Unqualified Lead onward is a named project. Pulling a project out of an Account leaves the Account where it is.',
  },
  {
    to: '/pipeline',
    title: 'Drag any card to "Delayed / Nurture"',
    body: 'The gate cannot be dismissed until a follow-up date is set. This is the rule that stops six-figure bids quietly disappearing — the pipeline refuses to let you park work without committing to chase it.',
  },
  {
    to: '/opportunities/op_egg_naperville',
    title: 'The whole project on one surface',
    body: 'One scrolling record, deliberately not tabs. Scroll to Photos & Files: artifacts are grouped by the stage they arrived at, so estimating and the crew visibly inherit the site visit instead of asking for it again.',
  },
  {
    to: '/estimate/op_egg_naperville',
    title: 'Estimate off the price book',
    body: 'Add a line — description, unit and pricing populate from FCG\u2019s real service line. An Area adds to the contract total; an Alternative is a client choice, so it does not.',
  },
  {
    to: '/estimate/op_egg_naperville',
    title: 'Preview, then simulate acceptance',
    body: 'The signed proposal advances the record to Awarded and fires the notification back to operations. Nobody re-keys anything.',
  },
  {
    to: '/schedule',
    title: 'Awarded work that is not scheduled',
    body: 'The newly awarded job surfaces in the warning strip. Click a bar to assign a crew leader, project manager and installers, and to trigger the material order to the franchisor.',
  },
  {
    to: '/field',
    title: 'Same components, field density',
    body: 'Switch "Viewing as" to a Field Tech. This is not a second application — it is the same component library at 48px rows and 44px touch targets, driven by one token.',
  },
  {
    to: '/admin',
    title: 'The franchisor lens',
    body: 'Switch to Nic Ugolini. Type 60540 into the routing tester to see inbound leads land in Chicago automatically, and royalty accrue at 5% of gross across every territory.',
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
        subtitle="Eight steps that walk one opportunity from prospect to paid."
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
              variant="attention"
              disabled={step === STEPS.length - 1}
              onClick={() => setStep((n) => n + 1)}
            >
              Next
            </Button>
          </>
        }
      >
        <ol className="space-y-1.5">
          {STEPS.map((item, i) => (
            <li key={i}>
              <button
                onClick={() => setStep(i)}
                className={
                  'flex w-full items-start gap-2.5 rounded-md border px-3 py-2.5 text-left transition-colors duration-(--duration-fast) ' +
                  (i === step
                    ? 'border-(--action-primary) bg-action-soft'
                    : 'border-subtle hover:bg-surface-inset')
                }
              >
                <span
                  className={
                    'mt-px flex h-5 w-5 shrink-0 items-center justify-center rounded-full font-mono text-2xs font-semibold ' +
                    (i === step ? 'bg-action text-white' : 'bg-surface-sunken text-muted')
                  }
                >
                  {i + 1}
                </span>
                <span className="min-w-0">
                  <span className="block text-base font-medium text-primary">{item.title}</span>
                  {i === step && (
                    <span className="mt-1 block text-sm leading-snug text-secondary">
                      {item.body}
                    </span>
                  )}
                </span>
              </button>
            </li>
          ))}
        </ol>
      </Modal>
    </>
  )
}
