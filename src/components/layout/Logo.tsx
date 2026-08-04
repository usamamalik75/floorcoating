type LogoProps = {
  size?: number
  variant?: 'red' | 'white'
  className?: string
}

/** Floor Coatings Group brand mark. */
export function Logo({ size = 28, variant = 'red', className }: LogoProps) {
  const imageHeight = Math.max(28, Math.round(size * 1.35))

  return (
    <div className={className ?? 'flex shrink-0 items-center'}>
      <img
        src={variant === 'white' ? '/fcg-logo-white.png' : '/fcg-logo.png'}
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
