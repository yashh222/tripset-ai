import { useState } from "react"
import { useNavigate, Link } from "react-router-dom"
import { Mail, Lock, Eye, EyeOff } from "lucide-react"
import { Button } from "@/components/ui/Button"
import { Field, Input } from "@/components/ui/Input"
import { GoogleIcon } from "@/components/common/GoogleIcon"
import { useAuth } from "@/context/AuthContext"
import { useToast } from "@/context/ToastContext"

export function LoginForm() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const { showToast } = useToast()
  const [showPw, setShowPw] = useState(false)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setIsSubmitting(true)
    try {
      const result = await login(email, password)
      showToast(`Welcome back, ${result.user.name || "Explorer"}!`, "success")
      navigate("/chat")
    } catch (err) {
      showToast(err.message || "Something went wrong. Please check your credentials.", "error")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="glass w-full rounded-[var(--radius)] p-8 shadow-float">
      <h2 className="font-display text-2xl font-bold text-white">Welcome back</h2>
      <p className="mt-1 text-sm text-white/70">
        Sign in to continue planning your journey.
      </p>

      <div className="mt-7 flex flex-col gap-5">
        <Field label="Email" htmlFor="email">
          <Input
            id="email"
            type="email"
            required
            icon={Mail}
            placeholder="you@example.com"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={isSubmitting}
          />
        </Field>

        <Field label="Password" htmlFor="password">
          <div className="relative">
            <Input
              id="password"
              type={showPw ? "text" : "password"}
              required
              icon={Lock}
              placeholder="•••••••••"
              autoComplete="current-password"
              className="pr-11"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isSubmitting}
            />
            <button
              type="button"
              onClick={() => setShowPw((s) => !s)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition hover:text-foreground"
              aria-label={showPw ? "Hide password" : "Show password"}
              disabled={isSubmitting}
            >
              {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </Field>

        <div className="flex justify-end">
          <a href="#" className="text-sm font-medium text-white/80 underline-offset-4 hover:underline">
            Forgot password?
          </a>
        </div>

        <Button type="submit" variant="primary" size="lg" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? "Signing in..." : "Sign in"}
        </Button>

        <div className="flex items-center gap-4">
          <span className="h-px flex-1 bg-white/20" />
          <span className="text-xs font-medium uppercase tracking-widest text-white/50">
            or
          </span>
          <span className="h-px flex-1 bg-white/20" />
        </div>

        <Button type="button" variant="glass" size="lg" className="w-full" disabled={isSubmitting}>
          <GoogleIcon className="h-5 w-5" />
          Continue with Google
        </Button>

        <p className="text-center text-sm text-white/70">
          New to Tripset AI?{" "}
          <Link to="/register" className="font-semibold text-white underline-offset-4 hover:underline">
            Create an account
          </Link>
        </p>
      </div>
    </form>
  )
}

