import { Link } from "react-router-dom"
import { Logo } from "@/components/common/Logo"
import { Button } from "@/components/ui/Button"

const links = ["Destinations", "Experiences", "Stories", "Support"]

export function Navbar() {
  return (
    <header className="absolute inset-x-0 top-0 z-20">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <Logo tone="light" />

        <ul className="hidden items-center gap-8 md:flex">
          {links.map((l) => (
            <li key={l}>
              <a
                href={`#${l.toLowerCase()}`}
                className="text-sm font-medium text-white/80 transition-colors hover:text-white"
              >
                {l}
              </a>
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-3">
          <Button as={Link} to="/login" variant="glass" size="sm">
            Sign in
          </Button>
          <Button as={Link} to="/chat" variant="primary" size="sm">
            Plan a trip
          </Button>
        </div>
      </nav>
    </header>
  )
}
