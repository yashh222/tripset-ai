import { cn } from "@/lib/utils"

export function Chip({ active, className, children, ...props }) {
  return (
    <button
      type="button"
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-all duration-200",
        active
          ? "border-transparent bg-foreground text-background"
          : "border-border bg-card text-foreground hover:border-foreground/30 hover:bg-muted/50",
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
}

export function ChipDark({ className, children, ...props }) {
  return (
    <button
      type="button"
      className={cn(
        "inline-flex items-center gap-2 rounded-full border border-dusk-border bg-dusk-soft/60 px-4 py-2 text-sm font-medium text-dusk-foreground transition-all duration-200 hover:border-primary/60 hover:bg-dusk-soft",
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
}
