import { ComparisonTable } from '#/features/marketing/components/comparison-table.tsx'
import { FeatureGrid } from '#/features/marketing/components/feature-grid.tsx'
import { HowItWorks } from '#/features/marketing/components/how-it-works.tsx'
import { KeyboardSpeed } from '#/features/marketing/components/keyboard-speed.tsx'
import { LandingContact } from '#/features/marketing/components/landing-contact.tsx'
import { LandingCta } from '#/features/marketing/components/landing-cta.tsx'
import { LandingFaq } from '#/features/marketing/components/landing-faq.tsx'
import { LandingFeedback } from '#/features/marketing/components/landing-feedback.tsx'
import { LandingFooter } from '#/features/marketing/components/landing-footer.tsx'
import { LandingHeader } from '#/features/marketing/components/landing-header.tsx'
import { LandingHero } from '#/features/marketing/components/landing-hero.tsx'
import { RoadmapStrip } from '#/features/marketing/components/roadmap-strip.tsx'

export function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <LandingHeader />
      <main>
        <LandingHero />
        <HowItWorks />
        <KeyboardSpeed />
        <FeatureGrid />
        <ComparisonTable />
        <RoadmapStrip />
        <LandingFeedback />
        <LandingFaq />
        <LandingContact />
        <LandingCta />
      </main>
      <LandingFooter />
    </div>
  )
}
