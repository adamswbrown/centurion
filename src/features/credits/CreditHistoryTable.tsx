"use client"

import { format } from "date-fns"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { ArrowUpCircle, ArrowDownCircle } from "lucide-react"

interface CreditTransaction {
  id: number
  amount: number
  reason: string
  createdAt: Date
  expiresAt: Date | null
  createdBy: {
    name: string | null
    email: string
  }
}

interface CreditHistoryTableProps {
  transactions: CreditTransaction[]
}

export function CreditHistoryTable({ transactions }: CreditHistoryTableProps) {
  if (transactions.length === 0) {
    return (
      <div className="text-center py-6 text-muted-foreground">
        No credit transactions found
      </div>
    )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Date</TableHead>
          <TableHead>Amount</TableHead>
          <TableHead>Reason</TableHead>
          <TableHead>Expires</TableHead>
          <TableHead>Processed By</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {transactions.map((transaction) => (
          <TableRow key={transaction.id}>
            <TableCell className="text-sm">
              {format(new Date(transaction.createdAt), "MMM dd, yyyy h:mm a")}
            </TableCell>
            <TableCell>
              <div className="flex items-center gap-1">
                {transaction.amount > 0 ? (
                  <ArrowUpCircle className="h-4 w-4 text-emerald-500" />
                ) : (
                  <ArrowDownCircle className="h-4 w-4 text-destructive" />
                )}
                <Badge
                  variant={transaction.amount > 0 ? "default" : "destructive"}
                >
                  {transaction.amount > 0 ? "+" : ""}
                  {transaction.amount}
                </Badge>
              </div>
            </TableCell>
            <TableCell className="max-w-[200px] truncate text-sm">
              {transaction.reason}
            </TableCell>
            <TableCell className="text-sm">
              {transaction.expiresAt
                ? format(new Date(transaction.expiresAt), "MMM dd, yyyy")
                : "-"}
            </TableCell>
            <TableCell className="text-sm text-muted-foreground">
              {transaction.createdBy.name || transaction.createdBy.email}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
