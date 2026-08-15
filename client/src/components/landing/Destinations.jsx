import { useState } from "react"
import { Chip } from "@/components/ui/Chip"
import { DestinationCard } from "./DestinationCard"
import { featuredDestinations } from "@/data/destinations"

const filters = ["All", "Beaches", "Mountains", "Cities", "Culture"]

export function Destinations() {
  const [active, setActive] = useState("All")

  const filteredDestinations =
    active === "All"
      ? featuredDestinations
      : featuredDestinations.filter(
        (destination) => destination.category === active
      )

  return (
    <section
      id="destinations"
      className="mx-auto max-w-6xl px-6 py-20 md:py-28"
    >
      <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-end">
        <div className="max-w-xl">
          <p className="text-sm font-semibold uppercase tracking-widest text-primary">
            Featured
          </p>

          <h2 className="mt-2 font-display text-3xl font-bold text-foreground text-balance md:text-4xl">
            Places we suggested to our travelers
          </h2>
        </div>

        <div className="flex flex-wrap gap-2">
          {filters.map((f) => (
            <Chip
              key={f}
              active={active === f}
              onClick={() => setActive(f)}
            >
              {f}
            </Chip>
          ))}
        </div>
      </div>

      <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {filteredDestinations.map((destination) => (
          <DestinationCard
            key={destination.id}
            destination={destination}
          />
        ))}
      </div>
    </section>
  )
}