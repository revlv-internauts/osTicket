"use client"

import * as React from "react"
import { Line, LineChart, CartesianGrid, XAxis, YAxis } from "recharts"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export const description = "An interactive line chart"

const chartConfig = {
  visitors: {
    label: "Tickets",
  },
  opened: {
    label: "Opened",
    color: "hsl(217, 91%, 60%)", 
  },
  closed: {
    label: "Closed",
    color: "hsl(0, 84%, 60%)", 
  },
} satisfies ChartConfig

export function ChartAreaInteractive({ data = [] }: { data?: any[] }) {
  const [timeRange, setTimeRange] = React.useState("week")

  const filteredData = data.filter((item) => {
    const date = new Date(item.date)
    const now = new Date()
    const startDate = new Date(now)
    
    if (timeRange === "week") {
      startDate.setDate(startDate.getDate() - 7)
    } else if (timeRange === "month") {
      startDate.setMonth(startDate.getMonth() - 1)
    } else if (timeRange === "year") {
      startDate.setFullYear(startDate.getFullYear() - 1)
    }
    
    return date >= startDate
  })
  
  const processedData = filteredData.map((item) => ({
    date: item.date,
    opened: Number(item.opened) || 0,
    closed: Number(item.closed) || 0,
  }))

  return (
    <Card className="pt-0">
      <CardHeader className="flex items-center gap-2 space-y-0 border-b py-5 sm:flex-row">
        <div className="grid flex-1 gap-1">
          <CardTitle>Ticket Statistics</CardTitle>
        </div>
        <Select value={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger
            className="hidden w-[160px] rounded-lg sm:ml-auto sm:flex"
            aria-label="Select a value"
          >
            <SelectValue placeholder="This Week" />
          </SelectTrigger>
          <SelectContent className="rounded-xl">
            <SelectItem value="week" className="rounded-lg">
              This Week
            </SelectItem>
            <SelectItem value="month" className="rounded-lg">
              This Month
            </SelectItem>
            <SelectItem value="year" className="rounded-lg">
              This Year
            </SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        {processedData.length === 0 ? (
          <div className="flex h-[250px] items-center justify-center text-muted-foreground">
            No ticket data available for the selected time range
          </div>
        ) : (
          <ChartContainer
            config={chartConfig}
            className="aspect-auto h-[250px] w-full"
          >
            <LineChart data={processedData}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                minTickGap={32}
                tickFormatter={(value) => {
                  const date = new Date(value)
                  return date.toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })
                }}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                allowDecimals={false}
              />
              <ChartTooltip
                cursor={false}
                content={
                  <ChartTooltipContent
                    labelFormatter={(value) => {
                      return new Date(value).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })
                    }}
                    indicator="dot"
                  />
                }
              />
              <Line
                dataKey="opened"
                type="monotone"
                stroke="var(--color-opened)"
                strokeWidth={2}
                dot={{
                  fill: "var(--color-opened)",
                }}
                activeDot={{
                  r: 6,
                }}
              />
              <Line
                dataKey="closed"
                type="monotone"
                stroke="var(--color-closed)"
                strokeWidth={2}
                dot={{
                  fill: "var(--color-closed)",
                }}
                activeDot={{
                  r: 6,
                }}
              />
              <ChartLegend content={<ChartLegendContent />} />
            </LineChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  )
}
