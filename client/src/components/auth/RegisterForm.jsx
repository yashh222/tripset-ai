import { useState } from "react"
import { useNavigate, Link } from "react-router-dom"
import { Mail, Lock, Eye, EyeOff, User, Phone } from "lucide-react"
import { Button } from "@/components/ui/Button"
import { Field, Input } from "@/components/ui/Input"
import { useAuth } from "@/context/AuthContext"
import { useToast } from "@/context/ToastContext"

export function RegisterForm() {
  const navigate = useNavigate()
  const { register } = useAuth()
  const { showToast } = useToast()
  const [showPw, setShowPw] = useState(false)
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [phone, setPhone] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setIsSubmitting(true)
    try {
      const result = await register(name, email, password, phone)
      showToast(`Welcome to Tripset AI, ${result.user.name || "Explorer"}! Account created successfully.`, "success")
      navigate("/chat")
    } catch (err) {
      showToast(err.message || "Registration failed. Please check the fields and try again.", "error")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="glass w-full rounded-[var(--radius)] p-8 shadow-float">
      <h2 className="font-display text-2xl font-bold text-white">Create an account</h2>
      <p className="mt-1 text-sm text-white/70">
        Start planning your custom AI journeys today.
      </p>

      <div className="mt-7 flex flex-col gap-5">
        <Field label="Full Name" htmlFor="name">
          <Input
            id="name"
            type="text"
            required
            icon={User}
            placeholder="John Doe"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={isSubmitting}
          />
        </Field>

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
              placeholder="Min. 6 characters"
              autoComplete="new-password"
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

        <Field label="Phone Number (Optional)" htmlFor="phone">
          <Input
            id="phone"
            type="tel"
            icon={Phone}
            placeholder="+1 (555) 000-0000"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            disabled={isSubmitting}
          />
        </Field>

        <Button type="submit" variant="primary" size="lg" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? "Creating account..." : "Sign up"}
        </Button>

        <p className="text-center text-sm text-white/70">
          Already have an account?{" "}
          <Link to="/login" className="font-semibold text-white underline-offset-4 hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </form>
  )
}
