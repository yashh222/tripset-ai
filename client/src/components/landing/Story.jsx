import { Link } from "react-router-dom"
import { ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/Button"
import { stats } from "@/data/destinations"

export function Story() {
  return (
    <section id="stories" className="bg-dusk text-dusk-foreground">
      <div className="mx-auto grid max-w-6xl items-center gap-12 px-6 py-20 md:grid-cols-2 md:py-28">
        <div className="relative">
          <img
            src="https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?q=80&w=1200&auto=format&fit=crop"
            alt="Traveler overlooking a mountain valley"
            className="h-[420px] w-full rounded-[var(--radius)] object-cover shadow-float"
          />
          <div className="glass-dark absolute -bottom-6 -right-4 hidden rounded-2xl p-5 sm:block">
            <p className="font-display text-2xl font-bold">7 days</p>
            <p className="text-sm text-dusk-muted">planned in 4 minutes</p>
          </div>
        </div>

        <div>
          <p className="text-sm font-semibold uppercase tracking-widest text-accent">
            Why Tripset AI
          </p>
          <h2 className="mt-3 font-display text-3xl font-bold text-balance md:text-4xl">
            Travel planning that feels like a conversation
          </h2>
          <p className="mt-4 text-pretty text-dusk-muted">
            No more twenty open tabs. Tell Tripset AI what you dream of, and it
            shapes a personal itinerary — flights, stays, and the little
            moments in between — that you can refine with a single message.
          </p>

          <dl className="mt-8 grid grid-cols-3 gap-4">
            {stats.map((s) => (
              <div
                key={s.label}
                className="rounded-2xl border border-dusk-border bg-dusk-2 p-4"
              >
                <dt className="font-display text-2xl font-bold">{s.value}</dt>
                <dd className="mt-1 text-xs text-dusk-muted">{s.label}</dd>
              </div>
            ))}
          </dl>

          <Button as={Link} to="/chat" variant="primary" size="lg" className="mt-8">
            Try the AI planner
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </section>
  )
}
