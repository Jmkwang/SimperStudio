interface SimperLogoProps {
  size?: number
  className?: string
}

/**
 * Brand logo for SimperStudio.
 *
 * Three small circles (workflow nodes) connected by curved lines (edges)
 * that trace an abstract "S" shape — evoking both the app name and its
 * workflow / node-connection identity.
 */
export function SimperLogo({ size = 18, className }: SimperLogoProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      className={className}
      aria-label="SimperStudio"
      role="img"
    >
      {/* Curved edges forming an "S" path */}
      <path
        d="M 6 6 Q 12 2, 18 6 Q 12 10, 6 18"
        stroke="hsl(var(--primary))"
        strokeWidth="1.5"
        strokeLinecap="round"
        fill="none"
        opacity="0.6"
      />

      {/* Top-left node */}
      <circle
        cx="6"
        cy="6"
        r="3"
        fill="hsl(var(--primary))"
      />

      {/* Top-right node */}
      <circle
        cx="18"
        cy="6"
        r="3"
        fill="hsl(var(--primary))"
      />

      {/* Bottom-center node */}
      <circle
        cx="6"
        cy="18"
        r="3"
        fill="hsl(var(--primary))"
        opacity="0.8"
      />
    </svg>
  )
}
