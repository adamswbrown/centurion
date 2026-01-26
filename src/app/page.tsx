import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Dumbbell, Calendar, Users, Heart, CreditCard, BarChart, ClipboardList, LayoutDashboard } from "lucide-react"

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-muted/50 p-6">
      <div className="max-w-3xl w-full flex flex-col items-center gap-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-2">Centurion Unified Fitness Platform</h1>
          <p className="text-lg text-muted-foreground mb-6">
            Modern gym management for personal trainers, coaches, and clients.<br />
            Schedule, coach, track, and grow—all in one place.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-2">
            <Link href="/login">
              <Button size="lg" className="text-base px-8 py-4">Log in</Button>
            </Link>
            <Link href="/register">
              <Button size="lg" variant="outline" className="text-base px-8 py-4 border-2">Sign up</Button>
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><LayoutDashboard className="h-5 w-5" /> For Coaches</CardTitle>
              <CardDescription>Powerful tools to manage your business and clients</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2"><Calendar className="h-5 w-5 text-primary" /> Appointment scheduling & calendar sync</div>
              <div className="flex items-center gap-2"><Dumbbell className="h-5 w-5 text-primary" /> Bootcamp & group class management</div>
              <div className="flex items-center gap-2"><Users className="h-5 w-5 text-primary" /> Member & cohort management</div>
              <div className="flex items-center gap-2"><ClipboardList className="h-5 w-5 text-primary" /> Review queue & progress tracking</div>
              <div className="flex items-center gap-2"><CreditCard className="h-5 w-5 text-primary" /> Invoicing, payments, and revenue analytics</div>
              <div className="flex items-center gap-2"><BarChart className="h-5 w-5 text-primary" /> Analytics dashboards</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Heart className="h-5 w-5" /> For Clients</CardTitle>
              <CardDescription>Everything your clients need to stay on track</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2"><Calendar className="h-5 w-5 text-primary" /> Book appointments & classes</div>
              <div className="flex items-center gap-2"><Heart className="h-5 w-5 text-primary" /> Daily check-ins & health tracking</div>
              <div className="flex items-center gap-2"><ClipboardList className="h-5 w-5 text-primary" /> Weekly questionnaires</div>
              <div className="flex items-center gap-2"><Users className="h-5 w-5 text-primary" /> Cohort program participation</div>
              <div className="flex items-center gap-2"><CreditCard className="h-5 w-5 text-primary" /> View & pay invoices</div>
              <div className="flex items-center gap-2"><BarChart className="h-5 w-5 text-primary" /> Progress & engagement stats</div>
            </CardContent>
          </Card>
        </div>

        <div className="text-center text-xs text-muted-foreground mt-8">
          <span>Centurion &copy; {new Date().getFullYear()} &mdash; Secure. Scalable. Built for results.</span>
        </div>
      </div>
    </main>
  )
}
