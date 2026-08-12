import { Link } from "react-router-dom"
import { ArrowLeft } from "lucide-react"
import { Logo } from "@/components/common/Logo"
import { LoginForm } from "@/components/auth/LoginForm"

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-dusk p-4 md:p-6 animate-page-enter">
      <div className="relative mx-auto grid min-h-[calc(100vh-3rem)] max-w-6xl overflow-hidden rounded-[2rem] shadow-float md:grid-cols-2">
        {/* Brand / image side */}
        <div className="relative hidden md:block">
          <img
            src="/hero-coast.png"
            alt="Golden-hour coastline"
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-tr from-dusk/85 via-dusk/40 to-transparent" />

          <div className="relative flex h-full flex-col justify-between p-10">
            <Logo tone="light" />

            <div>
              <h1 className="animate-rise font-display text-5xl font-bold leading-[1.02] text-white text-balance lg:text-6xl">
                Explore
                <br />
                horizons
              </h1>
              <p className="animate-rise delay-1 mt-4 max-w-sm text-pretty text-white/80">
                Where your dream destinations become reality. Plan every corner
                of the world within reach.
              </p>
            </div>
          </div>
        </div>

        {/* Form side */}
        <div className="relative flex flex-col justify-center bg-dusk-2 p-6 sm:p-10 md:p-12">
          <Link
            to="/"
            className="absolute left-6 top-6 inline-flex items-center gap-2 text-sm font-medium text-dusk-muted transition hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Back home
          </Link>

          <div className="mx-auto w-full max-w-md">
            <div className="mb-8 md:hidden">
              <Logo tone="light" />
            </div>
            <LoginForm />
          </div>
        </div>
      </div>
    </main>
  )
}
