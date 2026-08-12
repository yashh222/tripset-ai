import { cn } from "@/lib/utils"

export function Card({ className, children, ...props }) {
  return (
    <div
      className={cn(
        "rounded-[var(--radius)] border border-border bg-card text-card-foreground shadow-soft",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}
