import { Link } from '@tanstack/react-router'
import {
  ArrowDownLeftIcon,
  ArrowUpRightIcon,
  ChevronRightIcon,
  CircleCheckBigIcon,
  FileStackIcon,
  LandmarkIcon,
  MessageCircleIcon,
  PackageIcon,
  ReceiptIndianRupeeIcon,
  ScanTextIcon,
} from 'lucide-react'
import type { CSSProperties } from 'react'

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '#/components/ui/card.tsx'
import { Button } from '#/components/ui/button.tsx'
import { Skeleton } from '#/components/ui/skeleton.tsx'
import { paymentReminderLink } from '#/features/dashboard/payment-reminder.ts'
import { formatInr } from '#/lib/format-inr.ts'
import { cn } from '#/lib/utils.ts'
import type {
  AttentionItem,
  AttentionItemKind,
  AttentionTone,
} from '#/features/dashboard/attention-queue.ts'

const TONE_VAR: Record<AttentionTone, string> = {
  'money-in': 'var(--money-in)',
  'money-out': 'var(--money-out)',
  gst: 'var(--gst)',
  inventory: 'var(--inventory)',
  banking: 'var(--banking)',
  neutral: 'var(--muted-foreground)',
}

const TONE_TEXT: Record<AttentionTone, string> = {
  'money-in': 'text-money-in',
  'money-out': 'text-money-out',
  gst: 'text-gst',
  inventory: 'text-inventory',
  banking: 'text-banking',
  neutral: 'text-foreground',
}

const KIND_ICON: Record<AttentionItemKind, typeof ReceiptIndianRupeeIcon> = {
  'gst-due': ReceiptIndianRupeeIcon,
  'overdue-receivable': ArrowDownLeftIcon,
  'overdue-payable': ArrowUpRightIcon,
  'low-stock': PackageIcon,
  'unreconciled-bank': LandmarkIcon,
  'ocr-draft': ScanTextIcon,
  'pending-conversion': FileStackIcon,
}

/** Dense row rhythm, shared by real rows and skeletons so nothing jumps. */
const rowClassName =
  'flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-border/60 px-(--card-spacing) py-3'

function ToneIcon({
  kind,
  size = 'row',
  tone,
}: {
  kind?: AttentionItemKind
  size?: 'row' | 'hero'
  tone: AttentionTone
}) {
  const Icon = kind ? KIND_ICON[kind] : CircleCheckBigIcon
  return (
    <span
      className={cn(
        'icon-duotone grid shrink-0 place-items-center rounded-full bg-[color-mix(in_oklch,var(--icon-tone)_16%,transparent)]',
        size === 'hero' ? 'size-12' : 'size-8',
      )}
      style={{ '--icon-tone': TONE_VAR[tone] } as CSSProperties}
    >
      <Icon className={size === 'hero' ? 'size-6' : 'size-4'} />
    </span>
  )
}

function RowBody({ item }: { item: AttentionItem }) {
  return (
    <>
      <ToneIcon kind={item.kind} tone={item.tone} />
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="truncate text-sm font-medium">{item.title}</span>
        <span className="truncate text-xs text-muted-foreground">
          {item.detail}
        </span>
      </span>
      {item.amount ? (
        <span
          className={cn(
            'shrink-0 text-sm font-medium tabular-nums',
            TONE_TEXT[item.tone],
          )}
        >
          {formatInr(item.amount)}
        </span>
      ) : null}
      {/* The chevron slot is always reserved so amounts stay on one axis
          whether or not the row is actionable. */}
      {item.actionable ? (
        <ChevronRightIcon className="size-4 shrink-0 text-muted-foreground" />
      ) : (
        <span aria-hidden className="size-4 shrink-0" />
      )}
    </>
  )
}

type RowAction =
  | { label: string; href: string; icon: typeof MessageCircleIcon }
  | {
      label: string
      to: string
      search?: { mode: 'receipts' | 'payments' } | { tab: 'gstr3b' }
    }

/** The one-tap next step for each kind of row. */
function rowActions(item: AttentionItem, companyName: string): Array<RowAction> {
  if (!item.actionable) return []

  switch (item.kind) {
    case 'overdue-receivable': {
      const reminder = paymentReminderLink({
        phone: item.contactPhone,
        partyName: item.title.replace(/^Collect from /, ''),
        amount: item.amount ?? '0',
        companyName,
      })
      return [
        ...(reminder
          ? [{ label: 'Remind', href: reminder, icon: MessageCircleIcon }]
          : []),
        { label: 'Receipt', to: '/app/payments', search: { mode: 'receipts' } },
      ]
    }
    case 'overdue-payable':
      return [
        { label: 'Pay', to: '/app/payments', search: { mode: 'payments' } },
      ]
    case 'low-stock':
      return [{ label: 'Reorder', to: '/app/purchase-orders' }]
    case 'gst-due':
      return [
        { label: 'GSTR-3B', to: '/app/reports', search: { tab: 'gstr3b' } },
      ]
    default:
      return []
  }
}

function AttentionRow({
  companyName,
  item,
}: {
  companyName: string
  item: AttentionItem
}) {
  const actions = rowActions(item, companyName)

  return (
    <div className={rowClassName} data-attention-row="">
      {item.actionable ? (
        <Link
          className="-my-1 flex min-w-0 flex-1 basis-full items-center gap-3 rounded-md py-1 transition-colors duration-(--duration-fast) ease-(--ease-precise) hover:text-primary focus-visible:outline-none sm:basis-0 focus-visible:ring-2 focus-visible:ring-ring/50"
          data-row-link=""
          search={item.search}
          to={item.to}
        >
          <RowBody item={item} />
        </Link>
      ) : (
        <span className="flex min-w-0 flex-1 basis-full items-center gap-3 sm:basis-0">
          <RowBody item={item} />
        </span>
      )}
      {actions.length > 0 ? (
        <span className="ml-11 flex shrink-0 items-center gap-1.5 sm:ml-0">
          {actions.map((action) =>
            'href' in action ? (
              <Button asChild key={action.label} size="sm" variant="outline">
                <a
                  data-row-action=""
                  href={action.href}
                  rel="noreferrer"
                  target="_blank"
                >
                  <action.icon data-icon="inline-start" />
                  {action.label}
                </a>
              </Button>
            ) : (
              <Button asChild key={action.label} size="sm" variant="outline">
                <Link
                  data-row-action=""
                  search={action.search}
                  to={action.to}
                >
                  {action.label}
                </Link>
              </Button>
            ),
          )}
        </span>
      ) : null}
    </div>
  )
}

function AttentionSkeletonRow() {
  return (
    <div className={rowClassName}>
      <Skeleton className="size-8 shrink-0 rounded-full" />
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <Skeleton className="h-3.5 w-2/3 max-w-56" />
        <Skeleton className="h-3 w-1/2 max-w-40" />
      </div>
      <Skeleton className="h-3.5 w-20 shrink-0" />
      <span aria-hidden className="size-4 shrink-0" />
    </div>
  )
}

export type AttentionQueueCardProps = {
  className?: string
  /** Signs the WhatsApp payment reminders. */
  companyName: string
  isLoading?: boolean
  items: Array<AttentionItem>
}

/**
 * Hero container, disciplined contents: the card is a hero surface, the rows
 * inside follow dense-surface rules (hairlines, tight rhythm, no nested cards).
 */
export function AttentionQueueCard({
  className,
  companyName,
  isLoading = false,
  items,
}: AttentionQueueCardProps) {
  const showCount = !isLoading && items.length > 0

  return (
    <Card className={cn('gap-4', className)} size="hero">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          To do
          {showCount ? (
            <span className="text-sm font-normal tabular-nums text-muted-foreground">
              {items.length}
            </span>
          ) : null}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-0">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, index) => (
            <AttentionSkeletonRow key={index} />
          ))
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center gap-3 border-t border-border/60 px-(--card-spacing) py-10 text-center">
            <ToneIcon size="hero" tone="money-in" />
            <span className="text-base font-medium">
              Nothing needs your attention
            </span>
            <span className="max-w-sm text-sm text-muted-foreground">
              Every filing, balance and stock level is where it should be.
            </span>
          </div>
        ) : (
          items.map((item) => (
            <AttentionRow companyName={companyName} item={item} key={item.id} />
          ))
        )}
      </CardContent>
    </Card>
  )
}
