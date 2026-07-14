import type { LucideIcon } from 'lucide-react'
import { BriefcaseBusinessIcon } from 'lucide-react'

export type DashboardSectionId = 'dashboard' | 'settings'

export type SidebarCompany = {
  name: string
  plan: string
  icon: LucideIcon
}

export type IntentTone = 'info' | 'success' | 'warning' | 'danger' | 'neutral'

export type IntentBadge = {
  label: string
  tone: IntentTone
}

export type DashboardMetric = {
  id: string
  label: string
  value: string
  change: string
  tone: IntentTone
}

export type DashboardTrendPoint = {
  period: string
  sales: number
  expenses: number
}

export type RecentSale = {
  id: string
  party: string
  invoice: string
  status: 'Paid' | 'Part paid' | 'Pending'
  amount: string
}

export type ExpenseItem = {
  id: string
  label: string
  amount: string
  note: string
  tone: IntentTone
}

export type DashboardSection = {
  title: string
  description: string
  eyebrow: string
  badges: Array<IntentBadge>
  metrics: Array<DashboardMetric>
  trend: Array<DashboardTrendPoint>
  recentSales: Array<RecentSale>
  expenses: Array<ExpenseItem>
}

export const companies: Array<SidebarCompany> = [
  {
    name: 'Acme Inc',
    plan: 'Enterprise',
    icon: BriefcaseBusinessIcon,
  },
  {
    name: 'Shaban Textiles',
    plan: 'Wholesale',
    icon: BriefcaseBusinessIcon,
  },
]

export const dashboardSections: Record<DashboardSectionId, DashboardSection> = {
  dashboard: {
    eyebrow: 'General dashboard',
    title: 'Wholesale overview',
    description:
      'A live working surface for sales, expenses, stock movement, and collection follow-up.',
    badges: [
      { label: 'GST ready', tone: 'success' },
      { label: '3 firms connected', tone: 'info' },
    ],
    metrics: [
      {
        id: 'sales',
        label: 'Today sales',
        value: 'Rs. 4.82L',
        change: '+12.4%',
        tone: 'success',
      },
      {
        id: 'expense',
        label: 'Today expense',
        value: 'Rs. 18.4K',
        change: '-3.1%',
        tone: 'warning',
      },
      {
        id: 'receivable',
        label: 'Receivable',
        value: 'Rs. 18.72L',
        change: '24 parties due',
        tone: 'warning',
      },
      {
        id: 'gst',
        label: 'Net GST payable',
        value: 'Rs. 92.6K',
        change: 'June working',
        tone: 'info',
      },
    ],
    trend: [
      { period: 'Mon', sales: 320000, expenses: 19000 },
      { period: 'Tue', sales: 410000, expenses: 21000 },
      { period: 'Wed', sales: 365000, expenses: 17500 },
      { period: 'Thu', sales: 440000, expenses: 22600 },
      { period: 'Fri', sales: 482000, expenses: 18400 },
      { period: 'Sat', sales: 398000, expenses: 16300 },
    ],
    recentSales: [
      {
        id: '1',
        party: 'Mehta Saree Center',
        invoice: 'SI-1048',
        status: 'Part paid',
        amount: 'Rs. 42,880',
      },
      {
        id: '2',
        party: 'Noor Fabrics',
        invoice: 'SI-1047',
        status: 'Paid',
        amount: 'Rs. 31,260',
      },
      {
        id: '3',
        party: 'Raja Cutpiece',
        invoice: 'SI-1046',
        status: 'Pending',
        amount: 'Rs. 18,720',
      },
    ],
    expenses: [
      {
        id: '1',
        label: 'Loading',
        amount: 'Rs. 4,200',
        note: 'Godown dispatch',
        tone: 'neutral',
      },
      {
        id: '2',
        label: 'Transport',
        amount: 'Rs. 7,850',
        note: 'Surat lane delivery',
        tone: 'warning',
      },
      {
        id: '3',
        label: 'Packing',
        amount: 'Rs. 2,940',
        note: 'Loose fabric rolls',
        tone: 'neutral',
      },
    ],
  },
  settings: {
    eyebrow: 'Control center',
    title: 'Operations settings snapshot',
    description:
      'A quick read of operational settings health before deeper configuration screens are added.',
    badges: [
      { label: '2 alerts', tone: 'warning' },
      { label: 'FY 2026-27', tone: 'neutral' },
    ],
    metrics: [
      {
        id: 'companies',
        label: 'Companies',
        value: '3',
        change: '2 active GSTINs',
        tone: 'info',
      },
      {
        id: 'users',
        label: 'Users',
        value: '11',
        change: 'Roles mapped',
        tone: 'neutral',
      },
      {
        id: 'units',
        label: 'Unit rules',
        value: '18',
        change: 'Meter, thaan, piece',
        tone: 'neutral',
      },
      {
        id: 'backup',
        label: 'Last backup',
        value: '10 min',
        change: 'Healthy',
        tone: 'success',
      },
    ],
    trend: [
      { period: 'Mon', sales: 80000, expenses: 6000 },
      { period: 'Tue', sales: 110000, expenses: 7200 },
      { period: 'Wed', sales: 94000, expenses: 6100 },
      { period: 'Thu', sales: 120000, expenses: 8500 },
      { period: 'Fri', sales: 128000, expenses: 7900 },
      { period: 'Sat', sales: 102000, expenses: 6800 },
    ],
    recentSales: [
      {
        id: '1',
        party: 'Theme presets',
        invoice: 'UI-101',
        status: 'Paid',
        amount: 'Default applied',
      },
      {
        id: '2',
        party: 'Company setup',
        invoice: 'CFG-23',
        status: 'Part paid',
        amount: '2 pending steps',
      },
      {
        id: '3',
        party: 'Tax profile',
        invoice: 'GST-11',
        status: 'Pending',
        amount: 'Review required',
      },
    ],
    expenses: [
      {
        id: '1',
        label: 'Audit log',
        amount: 'Active',
        note: 'Last action 3 min ago',
        tone: 'success',
      },
      {
        id: '2',
        label: 'Invoice series',
        amount: 'Healthy',
        note: 'No gaps found',
        tone: 'success',
      },
      {
        id: '3',
        label: 'Permissions',
        amount: '2 alerts',
        note: 'Review invited users',
        tone: 'warning',
      },
    ],
  },
}
