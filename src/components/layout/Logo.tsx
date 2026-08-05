type LogoProps = {
  size?: number
  /** `red` = full-colour mark for light backgrounds; `white` for dark chrome. */
  variant?: 'red' | 'white'
  className?: string
}

/** Floor Coatings Group brand mark — red logo for light sidebars. */
export function Logo({ size = 28, variant = 'red', className }: LogoProps) {
  // Official transparent red mark: ~3:1 aspect; size is the display height.
  const imageHeight = Math.max(32, Math.round(size * 1.2))

  return (
    <div className={className ?? 'flex shrink-0 items-center'}>
      <img
        src={variant === 'white' ? '/fcg-logo-white.png' : '/fcg-logo-red.png'}
        alt="Floor Coatings Group"
        className="block h-auto w-auto max-w-full object-contain"
        style={{ height: imageHeight }}
      />
    </div>
  )
}

export function Wordmark({
  product = 'Floor Coatings Group',
  className,
}: {
  product?: string
  className?: string
}) {
  return <div className={className}>{product}</div>
}
