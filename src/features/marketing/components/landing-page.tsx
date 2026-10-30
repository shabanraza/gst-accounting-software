import { ComparisonTable } from '#/features/marketing/components/comparison-table.tsx'
import { FeatureShowcase } from '#/features/marketing/components/feature-showcase.tsx'
import { LandingCta } from '#/features/marketing/components/landing-cta.tsx'
import { LandingFaq } from '#/features/marketing/components/landing-faq.tsx'
import { LandingFooter } from '#/features/marketing/components/landing-footer.tsx'
import { LandingHeader } from '#/features/marketing/components/landing-header.tsx'
import { LandingHero } from '#/features/marketing/components/landing-hero.tsx'
import { PathwayCards } from '#/features/marketing/components/pathway-cards.tsx'
import { SecuritySection } from '#/features/marketing/components/security-section.tsx'
import { TrustStrip } from '#/features/marketing/components/trust-strip.tsx'

export function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <LandingHeader />
      <main>
        <LandingHero />
        <TrustStrip />
        <FeatureShowcase />
        <PathwayCards />
        <SecuritySection />
        <ComparisonTable />
        <LandingFaq />
        <LandingCta />
      </main>
      <LandingFooter />
    </div>
  )
}
