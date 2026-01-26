"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useRevenueReport } from "@/hooks/useReports"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts"

/**
 * RevenueAnalytics - Revenue metrics and visualizations (Admin only)
 * Generated with Claude Code
 */

const STATUS_COLORS = {
  PAID: "#22c55e",
  UNPAID: "#f59e0b",
  OVERDUE: "#ef4444",
  CANCELLED: "#6b7280",
}

const monthNames = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
]

export function RevenueAnalytics() {
  const currentYear = new Date().getFullYear()
  const [selectedYear, setSelectedYear] = useState(currentYear)
  const { data, isLoading } = useRevenueReport(selectedYear)

  const yearOptions = Array.from({ length: 6 }, (_, i) => currentYear - i)

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(cents / 100)
  }

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="md:col-span-2">
          <CardHeader>
            <div className="h-5 w-32 bg-muted animate-pulse rounded" />
          </CardHeader>
          <CardContent>
            <div className="h-80 bg-muted animate-pulse rounded" />
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!data) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Revenue data is only available to administrators.
        </CardContent>
      </Card>
    )
  }

  // Transform monthly data for chart
  const chartData = data.monthlyRevenue.map((m, index) => ({
    month: monthNames[index],
    revenue: m.revenue / 100, // Convert to dollars for display
    invoices: m.invoiceCount,
  }))

  return (
    <div className="space-y-4">
      {/* Year Selector */}
      <div className="flex justify-end">
        <Select
          value={String(selectedYear)}
          onValueChange={(value) => setSelectedYear(parseInt(value))}
        >
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {yearOptions.map((year) => (
              <SelectItem key={year} value={String(year)}>
                {year}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(data.totalRevenue)}</div>
            <p className="text-xs text-muted-foreground">{selectedYear}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">This Month</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(data.revenueThisMonth)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Last Month</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(data.revenueLastMonth)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Growth</CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold ${
                data.monthOverMonthGrowth >= 0 ? "text-green-600" : "text-red-600"
              }`}
            >
              {data.monthOverMonthGrowth >= 0 ? "+" : ""}
              {data.monthOverMonthGrowth.toFixed(1)}%
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Monthly Revenue Chart */}
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle>Monthly Revenue</CardTitle>
            <CardDescription>{selectedYear} revenue by month</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis
                    tickFormatter={(value) => `$${value.toLocaleString()}`}
                  />
                  <Tooltip
                    formatter={(value: number) => [
                      formatCurrency(value * 100),
                      "Revenue",
                    ]}
                  />
                  <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Invoice Status Distribution */}
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle>Invoice Status</CardTitle>
            <CardDescription>Distribution by payment status</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data.invoicesByStatus}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="count"
                    nameKey="status"
                    label={({ status, count }) => `${status}: ${count}`}
                  >
                    {data.invoicesByStatus.map((entry) => (
                      <Cell
                        key={entry.status}
                        fill={STATUS_COLORS[entry.status as keyof typeof STATUS_COLORS] || "#8884d8"}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number) => [`${value} invoices`, "Count"]}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Clients Table */}
      <Card>
        <CardHeader>
          <CardTitle>Top Clients</CardTitle>
          <CardDescription>Clients by revenue ({selectedYear})</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2 font-medium">Rank</th>
                  <th className="text-left p-2 font-medium">Client</th>
                  <th className="text-right p-2 font-medium">Invoices</th>
                  <th className="text-right p-2 font-medium">Total Revenue</th>
                </tr>
              </thead>
              <tbody>
                {data.topClients.map((client, index) => (
                  <tr key={client.id} className="border-b hover:bg-muted/50">
                    <td className="p-2 text-muted-foreground">#{index + 1}</td>
                    <td className="p-2">
                      <div className="font-medium">{client.name || "Unknown"}</div>
                      <div className="text-sm text-muted-foreground">{client.email}</div>
                    </td>
                    <td className="p-2 text-right">{client.invoiceCount}</td>
                    <td className="p-2 text-right font-medium">
                      {formatCurrency(client.totalRevenue)}
                    </td>
                  </tr>
                ))}
                {data.topClients.length === 0 && (
                  <tr>
                    <td colSpan={4} className="p-4 text-center text-muted-foreground">
                      No revenue data for {selectedYear}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
