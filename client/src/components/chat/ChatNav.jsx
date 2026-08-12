import { useState } from "react"
import { Link } from "react-router-dom"
import { Bell, ChevronDown, MessageSquareText, LogOut } from "lucide-react"
import { Logo } from "@/components/common/Logo"
import { cn } from "@/lib/utils"
import { useAuth } from "@/context/AuthContext"
import { useToast } from "@/context/ToastContext"

const navItems = [
  { label: "AI Chat", active: true },
  { label: "Explore", active: false },
  { label: "Itinerary", active: false },
  { label: "Stories", active: false },
]

export function ChatNav({ onToggleHistory, historyCount = 0 }) {
  const { user, logout } = useAuth()
  const { showToast } = useToast()
  const [showDropdown, setShowDropdown] = useState(false)

  const getInitials = (name) => {
    if (!name) return "EX"
    const parts = name.trim().split(/\s+/)
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase()
    }
    return name.slice(0, 2).toUpperCase()
  }

  const initials = getInitials(user?.name)
  const username = user?.email ? `@${user.email.split("@")[0]}` : "@explorer"

  return (
    <header className="border-b border-dusk-border">
      {/* Top row */}
      <div className="flex items-center justify-between px-4 py-3 md:px-6">
        <div className="flex items-center gap-6">
          <Link to="/">
            <Logo tone="light" />
          </Link>
          <nav className="hidden items-center gap-1 md:flex">
            {navItems.map((n) => (
              <button
                key={n.label}
                className={cn(
                  "inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium transition",
                  n.active
                    ? "bg-dusk-soft text-white"
                    : "text-dusk-muted hover:text-white"
                )}
              >
                {n.active && <MessageSquareText className="h-4 w-4" />}
                {n.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <button
            className="flex h-9 w-9 items-center justify-center rounded-full border border-dusk-border text-dusk-muted transition hover:text-white"
            aria-label="Notifications"
          >
            <Bell className="h-4 w-4" />
          </button>
          
          <div className="relative">
            <button
              onClick={() => setShowDropdown(!showDropdown)}
              className="flex items-center gap-2 rounded-full border border-dusk-border bg-dusk-soft/60 py-1 pl-1 pr-3 hover:bg-dusk-soft transition cursor-pointer text-left focus:outline-none"
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-sunset text-xs font-bold text-white">
                {initials}
              </span>
              <div className="hidden text-left sm:block">
                <p className="text-xs font-semibold leading-tight text-white">
                  {user?.name || "Explorer"}
                </p>
                <p className="text-[11px] leading-tight text-dusk-muted">{username}</p>
              </div>
              <ChevronDown className={cn("h-4 w-4 text-dusk-muted transition-transform", showDropdown && "rotate-180")} />
            </button>

            {showDropdown && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowDropdown(false)} />
                <div className="absolute right-0 mt-2 w-48 rounded-xl border border-dusk-border bg-dusk-2 p-1.5 shadow-float z-50">
                  <div className="px-3 py-2 text-left sm:hidden">
                    <p className="text-xs font-semibold text-white">{user?.name || "Explorer"}</p>
                    <p className="text-[10px] text-dusk-muted">{username}</p>
                  </div>
                  <div className="my-1 border-t border-dusk-border sm:hidden" />
                  <button
                    onClick={() => {
                      logout()
                      showToast("Logged out successfully.", "info")
                      setShowDropdown(false)
                    }}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium text-sunset hover:bg-white/5 transition"
                  >
                    <LogOut className="h-4 w-4" />
                    Sign out
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Sub row */}
      <div className="flex items-center justify-between px-4 py-2.5 md:px-6">
        <div className="flex items-center gap-3 text-sm">
          <button className="inline-flex items-center gap-1.5 font-medium text-white">
            Tripset AI 4.0
            <ChevronDown className="h-4 w-4 text-dusk-muted" />
          </button>
          <span className="h-4 w-px bg-dusk-border" />
          <span className="text-dusk-muted">Lisbon, Portugal</span>
        </div>
        <button 
          onClick={onToggleHistory}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-dusk-muted transition hover:text-white cursor-pointer"
        >
          Chat history {historyCount > 0 && `(${historyCount})`}
          <ChevronDown className="h-4 w-4" />
        </button>
      </div>
    </header>
  )
}

