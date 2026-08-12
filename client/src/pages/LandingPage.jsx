import { Hero } from "@/components/landing/Hero"
import { Destinations } from "@/components/landing/Destinations"
import { Story } from "@/components/landing/Story"
import { Footer } from "@/components/landing/Footer"

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-background text-foreground animate-page-enter">
      <Hero />
      <Destinations />
      <Story />
      <Footer />
    </main>
  )
}
