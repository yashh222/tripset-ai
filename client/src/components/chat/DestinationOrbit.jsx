import { orbitDestinations } from "@/data/destinations"
import { cn } from "@/lib/utils"

// Position coordinates to flank left and right margins of viewport
const positions = [
  // Left side floaters
  { left: "3.5vw", top: "16%", size: 85, delay: "0s" },
  { left: "10vw", top: "48%", size: 110, delay: "0.2s" },
  { left: "3vw", top: "76%", size: 90, delay: "0.4s" },
  // Right side floaters
  { right: "4vw", top: "20%", size: 95, delay: "0.15s" },
  { right: "12vw", top: "54%", size: 115, delay: "0.35s" },
]

export function DestinationOrbit() {
  return (
    <div className="absolute inset-0 pointer-events-none z-0 hidden md:block w-full h-full">
      {orbitDestinations.slice(0, 5).map((d, i) => {
        const pos = positions[i]

        return (
          <div
            key={d.id}
            className="absolute animate-float"
            style={{
              left: pos.left,
              right: pos.right,
              top: pos.top,
              animationDelay: pos.delay,
            }}
          >
            <div className="relative flex flex-col items-center group pointer-events-auto cursor-pointer">
              {/* Glass Info Tooltip on Hover */}
              <div className="absolute bottom-full mb-3 bg-dusk/95 border border-dusk-border/80 text-white rounded-xl px-3 py-1.5 text-xs font-semibold opacity-0 translate-y-1 transition duration-200 group-hover:opacity-100 group-hover:translate-y-0 whitespace-nowrap shadow-float z-10">
                <span className="block text-[11px] text-accent font-bold uppercase tracking-wider">
                  {d.country}
                </span>
                <span className="block text-white text-[13px] mt-0.5">
                  {d.name}
                </span>
              </div>

              {/* Destination Circular Card */}
              <div
                className={cn(
                  "overflow-hidden rounded-full border-2 border-dusk-border/70 shadow-float transition-all duration-300 group-hover:scale-105 group-hover:border-primary/80 group-hover:shadow-primary/10"
                )}
                style={{ width: pos.size, height: pos.size }}
              >
                <img
                  src={d.image || "/placeholder.svg"}
                  alt={`${d.name}, ${d.country}`}
                  className="h-full w-full object-cover transition duration-500 group-hover:scale-110"
                />
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
