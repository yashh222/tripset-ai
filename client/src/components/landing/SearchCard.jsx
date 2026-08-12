import { useState } from "react"
import { MapPin, CalendarDays, Users, Search, Hotel, Plane, Compass } from "lucide-react"
import { Card } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { cn } from "@/lib/utils"

const tabs = [
  { id: "stays", label: "Stays", icon: Hotel },
  { id: "flights", label: "Flights", icon: Plane },
  { id: "tours", label: "Tours", icon: Compass },
]

function SearchTab({ tab, active, onClick }) {
  const Icon = tab.icon
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition",
        active
          ? "bg-foreground text-background"
          : "text-muted-foreground hover:bg-muted/60"
      )}
    >
      <Icon className="h-4 w-4" />
      {tab.label}
    </button>
  )
}

function SearchField({ label, icon: Icon, value }) {
  return (
    <div className="flex-1 rounded-2xl border border-border bg-muted/40 px-4 py-3 text-left">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <div className="mt-1 flex items-center gap-2 text-sm font-medium text-foreground">
        <Icon className="h-4 w-4 text-muted-foreground" />
        {value}
      </div>
    </div>
  )
}

export function SearchCard() {
  const [active, setActive] = useState("stays")

  return (
    <Card className="mx-auto w-full max-w-4xl p-5 shadow-float md:p-6">
      <div className="flex items-center gap-2">
        {tabs.map((t) => (
          <SearchTab
            key={t.id}
            tab={t}
            active={active === t.id}
            onClick={() => setActive(t.id)}
          />
        ))}
      </div>

      <div className="mt-5 flex flex-col gap-3 md:flex-row md:items-stretch">
        <SearchField label="Where to" icon={MapPin} value="Lisbon, Portugal" />
        <SearchField label="Check in" icon={CalendarDays} value="12 May 2026" />
        <SearchField label="Check out" icon={CalendarDays} value="19 May 2026" />
        <SearchField label="Travelers" icon={Users} value="2 adults" />
        <Button size="lg" className="md:w-auto md:self-stretch">
          <Search className="h-4 w-4" />
          Search
        </Button>
      </div>
    </Card>
  )
}
