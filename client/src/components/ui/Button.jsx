import { cn } from "@/lib/utils"

const variants = {
  primary:
    "bg-sunset text-primary-foreground shadow-soft hover:brightness-105 active:brightness-95",
  solid:
    "bg-primary text-primary-foreground shadow-soft hover:brightness-105 active:brightness-95",
  outline:
    "border border-border bg-transparent text-foreground hover:bg-muted/60",
  ghost: "bg-transparent text-foreground hover:bg-muted/60",
  glass:
    "glass text-white hover:bg-white/15",
  dark: "bg-dusk-soft text-dusk-foreground border border-dusk-border hover:bg-dusk-2",
}

const sizes = {
  sm: "h-9 px-4 text-sm rounded-full",
  md: "h-11 px-6 text-sm rounded-full",
  lg: "h-13 px-8 text-base rounded-full",
  icon: "h-11 w-11 rounded-full",
}

export function Button({
  as: Comp = "button",
  variant = "primary",
  size = "md",
  className,
  children,
  ...props
}) {
  return (
    <Comp
      className={cn(
        "inline-flex select-none items-center justify-center gap-2 font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50",
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {children}
    </Comp>
  )
}
