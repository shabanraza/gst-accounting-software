import { Link } from '@tanstack/react-router'

import { ALTERNATIVE_SLUGS, ALTERNATIVES } from '#/features/marketing/alternatives-content.ts'
import { CONTENT_HUBS } from '#/features/marketing/content-pages.ts'
import { SITE } from '#/features/marketing/landing-content.ts'
import { TOOLS, TOOLS_HUB, TOOL_SLUGS, toolPath } from '#/features/tools/tools-content.ts'

function FooterLinkList({
  label,
  links,
}: {
  label: string
  links: ReadonlyArray<{ href: string; label: string }>
}) {
  return (
    <nav aria-label={label} className="flex flex-col gap-2">
      <p className="font-medium text-foreground">{label}</p>
      {links.map((link) => (
        <a key={link.href} className="hover:text-foreground" href={link.href}>
          {link.label}
        </a>
      ))}
    </nav>
  )
}

const TOOL_LINKS = [
  ...TOOL_SLUGS.map((slug) => ({ href: toolPath(slug), label: TOOLS[slug].name })),
  { href: TOOLS_HUB.path, label: 'All free tools' },
]

const LEARN_LINKS = [
  ...CONTENT_HUBS.guides.collection.pages.map((page) => ({
    href: `${CONTENT_HUBS.guides.collection.basePath}/${page.slug}`,
    label: page.label,
  })),
  { href: CONTENT_HUBS.useCases.collection.basePath, label: CONTENT_HUBS.useCases.collection.hubLabel },
  ...CONTENT_HUBS.comparisons.collection.pages.map((page) => ({
    href: `${CONTENT_HUBS.comparisons.collection.basePath}/${page.slug}`,
    label: page.label,
  })),
]

export function LandingFooter() {
  return (
    <footer className="border-t border-border/70">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 pt-10 text-sm text-muted-foreground sm:grid-cols-2">
        <FooterLinkList label="Free GST tools" links={TOOL_LINKS} />
        <FooterLinkList label="Learn GST" links={LEARN_LINKS} />
      </div>
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8 text-sm text-muted-foreground md:flex-row md:items-start md:justify-between">
        <p>
          © {new Date().getFullYear()} {SITE.name}. MIT License.
        </p>
        <nav aria-label="Compare" className="flex flex-wrap gap-4">
          {ALTERNATIVE_SLUGS.map((slug) => (
            <Link
              key={slug}
              className="hover:text-foreground"
              params={{ competitor: slug }}
              to="/alternatives/$competitor"
            >
              vs {ALTERNATIVES[slug].name}
            </Link>
          ))}
        </nav>
        <nav aria-label="Legal" className="flex flex-wrap gap-4">
          <Link className="hover:text-foreground" to="/contact">
            Contact
          </Link>
          <a className="hover:text-foreground" href="/#feedback">
            Feedback
          </a>
          <Link className="hover:text-foreground" to="/privacy">
            Privacy
          </Link>
          <Link className="hover:text-foreground" to="/data-deletion">
            Data deletion
          </Link>
          <a
            className="hover:text-foreground"
            href={SITE.githubUrl}
            rel="noreferrer"
            target="_blank"
          >
            GitHub
          </a>
        </nav>
      </div>
    </footer>
  )
}
