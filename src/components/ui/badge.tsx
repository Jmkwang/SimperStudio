import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center border px-2.5 py-0.5 text-xs font-medium transition-all duration-400 ease-out focus:outline-none focus:ring-1 focus:ring-ring rounded-xl",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground shadow-soft hover:brightness-105",
        secondary:
          "border-border bg-secondary text-secondary-foreground hover:bg-hover",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground hover:brightness-105",
        outline: "border-border text-foreground hover:bg-hover",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
