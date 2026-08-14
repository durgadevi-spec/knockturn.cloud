import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "relative inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 disabled:pointer-events-none disabled:opacity-50 overflow-hidden before:absolute before:inset-x-0 before:top-0 before:h-1/2 before:bg-white/20 before:content-[''] before:rounded-t-xl before:pointer-events-none [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 hover:-translate-y-0.5 active:translate-y-0",
  {
    variants: {
      variant: {
        default:
          "bg-gradient-to-br from-[#7f77dd] to-[#3c3489] text-white border border-[#534ab7] shadow-[0_6px_16px_rgba(83,74,183,0.35),inset_0_1px_0_rgba(255,255,255,0.35)]",
        destructive:
          "bg-gradient-to-r from-destructive to-red-500 text-destructive-foreground border border-red-300 shadow-[0_10px_20px_-12px_rgba(239,68,68,0.8)]",
        outline:
          "border border-[#d3d0e8] bg-white text-[#65637e] shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]",
        secondary:
          "border border-[#e6e4f2] bg-[#f8f7ff] text-[#3c3489] shadow-[0_1px_2px_rgba(38,33,92,0.04)]",
        ghost: "border border-transparent bg-transparent text-[#65637e] hover:bg-[#eeedfe] hover:text-[#3c3489]",
        link: "text-primary underline-offset-4 hover:underline border border-transparent bg-transparent shadow-none",
      },
      size: {
        default: "min-h-10 px-4 py-2",
        sm: "min-h-8 rounded-lg px-3 text-xs",
        lg: "min-h-11 rounded-xl px-8",
        icon: "h-10 w-10 rounded-xl",
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
