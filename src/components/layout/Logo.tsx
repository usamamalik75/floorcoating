/** Official lockup aspect ratio (300×98). */
const ASPECT = 300 / 98

const SRC = {
  red: '/fcg-logo.png',
  white: '/fcg-logo-white.png',
} as const

type LogoProps = {
  /** Image height in px. Width follows the lockup aspect ratio. */
  size?: number
  /** `white` for dark chrome; `red` for light surfaces. */
  variant?: keyof typeof SRC
  className?: string
}

/** Official FCG lockup — US map + FLOOR COATINGS GROUP. */
export function Logo({ size = 28, variant = 'red', className }: LogoProps) {
  const height = size
  const width = Math.round(size * ASPECT)
  return (
    <img
      src={SRC[variant]}
      alt="Floor Coatings Group"
      width={width}
      height={height}
      className={className ?? 'shrink-0'}
      draggable={false}
    />
  )
}

/** Product line under the lockup — Operations Platform or Franchise Management. */
export function Wordmark({
  product = 'Operations Platform',
  className,
}: {
  product?: string
  className?: string
}) {
  return (
    <div className={className}>
      <div className="text-2xs leading-none tracking-[0.18em] uppercase opacity-70">{product}</div>
    </div>
  )
}
