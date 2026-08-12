import { MapPin } from "lucide-react"
import { Card } from "@/components/ui/Card"

export function DestinationCard({ destination }) {
  const { name, country, price, image, tag } = destination
  return (
    <Card className="group overflow-hidden p-0">
      <div className="relative h-56 overflow-hidden">
        <img
          src={image || "/placeholder.svg"}
          alt={`${name}, ${country}`}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <span className="absolute right-3 top-3 rounded-full bg-card/90 px-3 py-1 text-xs font-semibold text-foreground backdrop-blur">
          from ${price}
        </span>
      </div>
      <div className="p-5">
        <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <MapPin className="h-3.5 w-3.5" />
          {country}
        </div>
        <h3 className="mt-1 font-display text-lg font-semibold text-foreground">
          {name}
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">{tag}</p>
      </div>
    </Card>
  )
}
