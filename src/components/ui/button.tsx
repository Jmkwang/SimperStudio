import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium transition-all duration-400 ease-out focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-soft hover:shadow-glow-sm hover:brightness-105 active:scale-[0.97]",
        destructive:
          "bg-destructive text-destructive-foreground shadow-soft hover:brightness-105 active:scale-[0.97]",
        outline:
          "border border-border bg-transparent hover:bg-hover hover:border-foreground/[0.10] active:scale-[0.97]",
        secondary:
          "bg-secondary text-secondary-foreground border border-border hover:bg-hover active:scale-[0.97]",
        ghost: "hover:bg-hover hover:text-foreground",
        link: "text-lunar-300 underline-offset-4 hover:underline hover:text-lunar-200",
      },
      size: {
        default: "h-9 px-4 py-2 rounded-xl",
        sm: "h-8 px-3 text-xs rounded-xl",
        lg: "h-10 px-8 rounded-xl",
        icon: "h-9 w-9 rounded-xl",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
