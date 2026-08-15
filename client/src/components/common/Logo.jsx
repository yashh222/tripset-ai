import { cn } from "@/lib/utils"

export function Logo({ className, tone = "light", showMark = true }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 font-display text-xl font-bold tracking-tight",
        tone === "light" ? "text-white" : "text-foreground",
        className
      )}
    >
      {showMark && (
        <span className="flex h-10 w-8 items-center justify-center rounded-xl overflow-hidden">
          <img
            src="https://res.cloudinary.com/shpt76oi/image/upload/v1786786560/Blue_White_Minimalist_Streetwear_Logo_cvqft5.png"
            alt="Tripset AI logo"
            className="h-full w-full object-contain"
          />
        </span>
      )}
      Tripset AI
    </span>
  )
}