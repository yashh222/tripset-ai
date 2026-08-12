import { Link } from "react-router-dom"
import { ArrowRight, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/Button"
import { Navbar } from "./Navbar"
import { SearchCard } from "./SearchCard"

export function Hero() {
  return (
    <section className="relative">
      <Navbar />

      <div className="relative overflow-hidden rounded-b-[2.5rem]">
        {/* Background image */}
        <img
          src="/hero-coast.png"
          alt="Aerial view of a golden-hour coastline"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-dusk/60 via-dusk/25 to-dusk/70" />

        {/* Content */}
        <div className="relative mx-auto flex min-h-[86vh] max-w-6xl flex-col items-center justify-center px-6 pt-28 text-center">
          <span className="animate-rise inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-sm font-medium text-white backdrop-blur">
            <Sparkles className="h-4 w-4" />
            AI-planned trips, made effortless
          </span>

          <h1 className="animate-rise delay-1 mt-6 max-w-3xl font-display text-5xl font-bold leading-[1.02] text-white text-balance md:text-7xl">
            Your next journey starts here
          </h1>

          <p className="animate-rise delay-2 mt-5 max-w-xl text-pretty text-base text-white/80 md:text-lg">
            Discover extraordinary places, build your itinerary with an AI
            companion, and book it all in one calm, beautiful space.
          </p>

          <div className="animate-rise delay-3 mt-8 mb-14 flex flex-wrap items-center justify-center gap-3">
            <Button as={Link} to="/chat" variant="primary" size="lg">
              Start planning
              <ArrowRight className="h-4 w-4" />
            </Button>
            <Button as="a" href="#destinations" variant="glass" size="lg">
              Explore destinations
            </Button>
          </div>
        </div>

        {/* Overlapping search card */}
        <div className="relative z-10 -mt-16 px-6 pb-6 md:-mt-20">
          <div className="animate-rise delay-4">
            <SearchCard />
          </div>
        </div>
      </div>
    </section>
  )
}
