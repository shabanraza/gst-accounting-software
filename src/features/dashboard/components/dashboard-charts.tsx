import { Bar, BarChart, CartesianGrid, Cell, XAxis, YAxis } from 'recharts'

import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from '#/components/ui/chart.tsx'
import { ageingBucketChartColor } from '#/lib/badge-intent.ts'
import { formatShortDate } from '#/lib/calendar-date.ts'
import { formatInr } from '#/lib/format-inr.ts'

import type { AgeingBucketLabel } from '#/features/accounting/ageing-service.ts'
import type { OwnerDashboardSnapshot } from '#/features/dashboard/dashboard-owner-service.ts'

// Recharts is the largest dependency on the dashboard, so these charts live in
// their own module and are loaded lazily after the figures render.

const trendChartConfig = {
  sales: {
    label: 'Sales',
    color: 'var(--chart-1)',
  },
  purchases: {
    label: 'Purchases',
    color: 'var(--chart-2)',
  },
}

const ageingChartConfig = {
  amount: {
    label: 'Outstanding',
    color: 'var(--warning)',
  },
}

export function TrendChart({
  data,
}: {
  data: OwnerDashboardSnapshot['trend']
}) {
  return (
    <ChartContainer
      className="aspect-auto h-56 w-full"
      config={trendChartConfig}
    >
      <BarChart data={data}>
        <CartesianGrid vertical={false} />
        <XAxis
          axisLine={false}
          dataKey="date"
          tickFormatter={formatShortDate}
          tickLine={false}
          tickMargin={8}
        />
        <ChartTooltip
          content={
            <ChartTooltipContent
              formatter={(value, name) => (
                <span className="tabular-nums">
                  {name}: {formatInr(String(value))}
                </span>
              )}
              labelFormatter={(value) => formatShortDate(String(value))}
            />
          }
        />
        <ChartLegend content={<ChartLegendContent />} />
        <Bar dataKey="sales" fill="var(--color-sales)" radius={4} />
        <Bar dataKey="purchases" fill="var(--color-purchases)" radius={4} />
      </BarChart>
    </ChartContainer>
  )
}

export function AgeingChart({
  data,
}: {
  data: Array<{ bucket: string; bucketKey: AgeingBucketLabel; amount: number }>
}) {
  return (
    <ChartContainer
      className="aspect-auto h-48 w-full"
      config={ageingChartConfig}
    >
      <BarChart data={data} layout="vertical" margin={{ left: 8 }}>
        <CartesianGrid horizontal={false} />
        <XAxis hide type="number" />
        <YAxis
          axisLine={false}
          dataKey="bucket"
          tickLine={false}
          type="category"
          width={72}
        />
        <ChartTooltip
          content={
            <ChartTooltipContent
              formatter={(value) => formatInr(String(value))}
            />
          }
        />
        <Bar dataKey="amount" radius={4}>
          {data.map((row) => (
            <Cell
              fill={ageingBucketChartColor(row.bucketKey)}
              key={row.bucketKey}
            />
          ))}
        </Bar>
      </BarChart>
    </ChartContainer>
  )
}
