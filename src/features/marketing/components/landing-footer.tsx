import { Link } from '@tanstack/react-router'
import type { ReactNode } from 'react'

import {
  ALTERNATIVE_SLUGS,
  ALTERNATIVES,
} from '#/features/marketing/alternatives-content.ts'
import { CONTENT_HUBS } from '#/features/marketing/content-pages.ts'
import { SHOWCASE, SITE } from '#/features/marketing/landing-content.ts'
import { TOOLS, TOOLS_HUB, TOOL_SLUGS, toolPath } from '#/features/tools/tools-content.ts'

const linkClassName = 'hover:text-foreground'

function FooterColumn({
  children,
  title,
}: {
  children: ReactNode
  title: string
}) {
  return (
    <nav aria-label={title} className="flex flex-col gap-3">
      <span className="text-sm font-medium text-foreground">{title}</span>
      {children}
    </nav>
  )
}

const { guides, useCases, comparisons } = CONTENT_HUBS

export function LandingFooter() {
  return (
    <footer className="border-t border-border/70">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 text-sm text-muted-foreground sm:grid-cols-2 lg:grid-cols-3">
        <div className="flex max-w-xs flex-col gap-3">
          <span className="font-heading text-base font-semibold text-foreground">
            {SITE.name}
          </span>
          <p>
            Free, open-source GST billing and accounting software for Indian
            businesses.
          </p>
        </div>

        <FooterColumn title="Product">
          {SHOWCASE.items.map((item) => (
            <Link className={linkClassName} hash={item.id} key={item.id} to="/">
              {item.title}
            </Link>
          ))}
          <Link className={linkClassName} hash="security" to="/">
            Security
          </Link>
          <Link className={linkClassName} to="/changelog">
            Changelog
          </Link>
        </FooterColumn>

        <FooterColumn title="Free GST tools">
          {TOOL_SLUGS.map((slug) => (
            <Link className={linkClassName} key={slug} to={toolPath(slug)}>
              {TOOLS[slug].name}
            </Link>
          ))}
          <Link className={linkClassName} to={TOOLS_HUB.path}>
            All free tools
          </Link>
        </FooterColumn>

        <FooterColumn title="Learn GST">
          {guides.collection.pages.map((page) => (
            <Link
              className={linkClassName}
              key={page.slug}
              params={{ slug: page.slug }}
              to={guides.collection.pageRoute}
            >
              {page.label}
            </Link>
          ))}
          <Link className={linkClassName} to={useCases.collection.basePath}>
            {useCases.collection.hubLabel}
          </Link>
          {comparisons.collection.pages.map((page) => (
            <Link
              className={linkClassName}
              key={page.slug}
              params={{ slug: page.slug }}
              to={comparisons.collection.pageRoute}
            >
              {page.label}
            </Link>
          ))}
        </FooterColumn>

        <FooterColumn title="Compare">
          {ALTERNATIVE_SLUGS.map((slug) => (
            <Link
              className={linkClassName}
              key={slug}
              params={{ competitor: slug }}
              to="/alternatives/$competitor"
            >
              {ALTERNATIVES[slug].name} alternative
            </Link>
          ))}
        </FooterColumn>

        <FooterColumn title="Company">
          <Link className={linkClassName} to="/contact">
            Contact
          </Link>
          <Link className={linkClassName} hash="feedback" to="/">
            Feedback
          </Link>
          <a
            className={linkClassName}
            href={SITE.githubUrl}
            rel="noreferrer"
            target="_blank"
          >
            GitHub
          </a>
          <Link className={linkClassName} to="/privacy">
            Privacy
          </Link>
          <Link className={linkClassName} to="/data-deletion">
            Data deletion
          </Link>
          <a className={linkClassName} href="mailto:support@hisaabkro.in">
            support@hisaabkro.in
          </a>
        </FooterColumn>
      </div>
      <div className="border-t border-border/70">
        <p className="mx-auto max-w-6xl px-4 py-6 text-xs text-muted-foreground">
          © {new Date().getFullYear()} {SITE.name}. MIT License.
        </p>
      </div>
    </footer>
  )
}
