import { cn } from "@/lib/utils"

export function Field({ label, htmlFor, children, className }) {
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {label && (
        <label
          htmlFor={htmlFor}
          className="text-sm font-medium text-white/80"
        >
          {label}
        </label>
      )}
      {children}
    </div>
  )
}

export function Input({ className, icon: Icon, ...props }) {
  return (
    <div className="relative">
      {Icon && (
        <Icon className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/50" />
      )}
      <input
        className={cn(
          "h-12 w-full rounded-2xl border border-white/15 bg-white/95 px-4 text-sm text-foreground placeholder:text-muted-foreground shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/40",
          Icon && "pl-11",
          className
        )}
        {...props}
      />
    </div>
  )
}
