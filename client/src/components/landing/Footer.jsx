import { Logo } from "@/components/common/Logo"

const groups = [
  { title: "Explore", items: ["Destinations", "Experiences", "Stays", "Flights"] },
  { title: "Company", items: ["About", "Stories", "Careers", "Press"] },
  { title: "Support", items: ["Help center", "Contact", "Privacy", "Terms"] },
]

export function Footer() {
  return (
    <footer className="border-t border-border bg-background">
      <div className="mx-auto grid max-w-6xl gap-10 px-6 py-16 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div>
          <Logo tone="dark" />
          <p className="mt-4 max-w-xs text-sm text-muted-foreground">
            The calm way to plan extraordinary trips, powered by an AI travel
            companion.
          </p>
        </div>
        {groups.map((g) => (
          <div key={g.title}>
            <h4 className="text-sm font-semibold text-foreground">{g.title}</h4>
            <ul className="mt-4 space-y-3">
              {g.items.map((i) => (
                <li key={i}>
                  <a
                    href="#"
                    className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {i}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-border">
        <p className="mx-auto max-w-6xl px-6 py-6 text-sm text-muted-foreground">
          © {new Date().getFullYear()} Tripset AI. Designed by Yash.
        </p>
      </div>
    </footer>
  )
}
