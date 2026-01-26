"use client"

import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  OverviewCards,
  MemberEngagementChart,
  CohortAnalytics,
  RevenueAnalytics,
  ComplianceReport,
  ExportButton,
  ExportAllButton,
} from "./index"

/**
 * ReportsDashboard - Main reports page with tabbed navigation
 * Role-based: Admin sees all reports, Coach sees cohort-filtered data
 * Generated with Claude Code
 */

interface ReportsDashboardProps {
  userRole: "ADMIN" | "COACH"
}

export function ReportsDashboard({ userRole }: ReportsDashboardProps) {
  const [activeTab, setActiveTab] = useState("overview")
  const isAdmin = userRole === "ADMIN"

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Reports Dashboard</h1>
          <p className="text-muted-foreground">
            {isAdmin
              ? "Platform-wide analytics and insights"
              : "Analytics for your cohorts and members"}
          </p>
        </div>
        <div className="flex gap-2">
          {isAdmin && <ExportAllButton />}
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-5 lg:w-auto lg:inline-grid">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="members">Members</TabsTrigger>
          <TabsTrigger value="cohorts">Cohorts</TabsTrigger>
          {isAdmin && <TabsTrigger value="revenue">Revenue</TabsTrigger>}
          <TabsTrigger value="compliance">Compliance</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <OverviewCards />
          <div className="grid gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <MemberEngagementChart />
            </div>
          </div>
        </TabsContent>

        {/* Members Tab */}
        <TabsContent value="members" className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold">Member Engagement</h2>
              <p className="text-muted-foreground">
                Track member activity and engagement metrics
              </p>
            </div>
            <ExportButton reportType="members" />
          </div>
          <MemberEngagementChart />
        </TabsContent>

        {/* Cohorts Tab */}
        <TabsContent value="cohorts" className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold">Cohort Analytics</h2>
              <p className="text-muted-foreground">
                Performance metrics across all cohorts
              </p>
            </div>
            <ExportButton reportType="cohorts" />
          </div>
          <CohortAnalytics />
        </TabsContent>

        {/* Revenue Tab (Admin Only) */}
        {isAdmin && (
          <TabsContent value="revenue" className="space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold">Revenue Analytics</h2>
                <p className="text-muted-foreground">
                  Financial performance and billing insights
                </p>
              </div>
              <ExportButton reportType="revenue" />
            </div>
            <RevenueAnalytics />
          </TabsContent>
        )}

        {/* Compliance Tab */}
        <TabsContent value="compliance" className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold">Compliance Report</h2>
              <p className="text-muted-foreground">
                Questionnaire completion rates and compliance metrics
              </p>
            </div>
            <ExportButton reportType="compliance" />
          </div>
          <ComplianceReport />
        </TabsContent>
      </Tabs>
    </div>
  )
}
