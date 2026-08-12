import { Compass } from "lucide-react"
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
        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-sunset text-white">
          <Compass className="h-5 w-5" strokeWidth={2.4} />
        </span>
      )}
      Tripset AI
    </span>
  )
}
