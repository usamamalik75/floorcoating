import { Workflow } from 'lucide-react'

type LogoProps = {
  size?: number
  variant?: 'red' | 'white'
  className?: string
}

/** Neutral product identity; customer branding can replace this per workspace. */
export function Logo({ size = 28, variant = 'red', className }: LogoProps) {
  const light = variant === 'white'
  const imageHeight = Math.max(28, Math.round(size * 1.35))

  if (light) {
    return (
      <div className={className ?? 'flex shrink-0 items-center'}>
        <img
          src="/fcg-logo-white.png"
          alt="Floor Coatings Group"
          className="block h-auto w-auto max-w-full object-contain"
          style={{ height: imageHeight }}
        />
      </div>
    )
  }

  return (
    <div className={className ?? 'flex shrink-0 items-center gap-2.5'}>
      <span className='grid rounded-lg bg-(--action-primary) p-2 text-white shadow-glow-primary'>
        <Workflow size={Math.max(18, Math.round(size * 0.55))} />
      </span>
      <span className='text-primary'>
        <span className='block text-base font-bold leading-none tracking-tight'>Service Operations</span>
        <span className='mt-1 block text-2xs tracking-[0.16em] uppercase opacity-60'>CRM + Field Service</span>
      </span>
    </div>
  )
}

export function Wordmark({
  product = 'Service Operations',
  className,
}: {
  product?: string
  className?: string
}) {
  return <div className={className}>{product}</div>
}
