"use client"

import { format } from "date-fns"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { EditClientDialog } from "./EditClientDialog"

interface ClientDetailProps {
  client: {
    id: number
    name: string | null
    email: string
    image: string | null
    createdAt: Date
    emailVerified: boolean
    appointments: Array<{
      id: number
      startTime: Date
      status: string
    }>
    cohortMemberships: Array<{
      id: number
      joinedAt: Date
      status: string
      cohort: {
        id: number
        name: string
      }
    }>
    invoices: Array<{
      id: number
      month: Date
      totalAmount: any
      emailSent: boolean
    }>
  }
}

export function ClientDetail({ client }: ClientDetailProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{client.name}</h1>
          <p className="text-muted-foreground">{client.email}</p>
        </div>
        <EditClientDialog client={client} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Client Information</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-muted-foreground">Email</Label>
            <p className="text-sm font-medium">{client.email}</p>
          </div>
          <div>
            <Label className="text-muted-foreground">Joined</Label>
            <p className="text-sm font-medium">
              {format(new Date(client.createdAt), "MMM dd, yyyy")}
            </p>
          </div>
          <div>
            <Label className="text-muted-foreground">Email Verified</Label>
            <Badge variant={client.emailVerified ? "default" : "outline"}>
              {client.emailVerified ? "Verified" : "Pending"}
            </Badge>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent Appointments</CardTitle>
          <CardDescription>
            {client.appointments.length} appointment(s)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {client.appointments.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No appointments yet
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {client.appointments.map((apt) => (
                  <TableRow key={apt.id}>
                    <TableCell>
                      {format(new Date(apt.startTime), "MMM dd, yyyy")}
                    </TableCell>
                    <TableCell>
                      {format(new Date(apt.startTime), "hh:mm a")}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {apt.status === "ATTENDED" ? "Attended" : "Not Attended"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Active Cohorts</CardTitle>
          <CardDescription>
            {client.cohortMemberships.length} cohort(s)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {client.cohortMemberships.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Not part of any cohorts
            </p>
          ) : (
            <div className="space-y-2">
              {client.cohortMemberships.map((membership) => (
                <div
                  key={membership.id}
                  className="flex items-center justify-between p-2 border rounded"
                >
                  <div>
                    <p className="font-medium">{membership.cohort.name}</p>
                    <p className="text-sm text-muted-foreground">
                      Joined {format(new Date(membership.joinedAt), "MMM dd, yyyy")}
                    </p>
                  </div>
                  <Badge variant="outline">{membership.status}</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent Invoices</CardTitle>
          <CardDescription>
            {client.invoices.length} invoice(s)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {client.invoices.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No invoices yet
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Month</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {client.invoices.map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell>
                      {format(new Date(invoice.month), "MMM yyyy")}
                    </TableCell>
                    <TableCell>${invoice.totalAmount}</TableCell>
                    <TableCell>
                      <Badge
                        variant={invoice.emailSent ? "default" : "outline"}
                      >
                        {invoice.emailSent ? "Sent" : "Pending"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
