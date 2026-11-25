import { Bar, BarChart, CartesianGrid, XAxis } from 'recharts'

import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from '#/components/ui/chart.tsx'
import { formatShortDate } from '#/lib/calendar-date.ts'
import { formatInr } from '#/lib/format-inr.ts'

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
