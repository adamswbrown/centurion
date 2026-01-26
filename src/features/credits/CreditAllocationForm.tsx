"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { allocateCredits } from "@/app/actions/credits"
import { PlusCircle, MinusCircle } from "lucide-react"

interface CreditAllocationFormProps {
  userId: number
  currentBalance: number
  onSuccess?: (newBalance: number) => void
}

export function CreditAllocationForm({
  userId,
  currentBalance,
  onSuccess,
}: CreditAllocationFormProps) {
  const [amount, setAmount] = useState("")
  const [reason, setReason] = useState("")
  const [expiryDate, setExpiryDate] = useState("")
  const [isDeduction, setIsDeduction] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(null)

    const numAmount = parseInt(amount, 10)
    if (isNaN(numAmount) || numAmount <= 0) {
      setError("Please enter a valid positive number")
      return
    }

    if (!reason.trim()) {
      setError("Please provide a reason")
      return
    }

    setIsLoading(true)

    try {
      const finalAmount = isDeduction ? -numAmount : numAmount
      const result = await allocateCredits({
        userId,
        amount: finalAmount,
        reason: reason.trim(),
        expiryDate: expiryDate || null,
      })

      setSuccess(
        isDeduction
          ? `Deducted ${numAmount} credits. New balance: ${result.newBalance}`
          : `Allocated ${numAmount} credits. New balance: ${result.newBalance}`
      )
      setAmount("")
      setReason("")
      setExpiryDate("")

      if (onSuccess) {
        onSuccess(result.newBalance)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to allocate credits")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="rounded-md border p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Manage Credits</h3>
        <div className="text-sm">
          Current Balance: <span className="font-bold">{currentBalance}</span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex gap-2 mb-4">
          <Button
            type="button"
            variant={!isDeduction ? "default" : "outline"}
            size="sm"
            onClick={() => setIsDeduction(false)}
            className="flex items-center gap-1"
          >
            <PlusCircle className="h-4 w-4" />
            Add Credits
          </Button>
          <Button
            type="button"
            variant={isDeduction ? "destructive" : "outline"}
            size="sm"
            onClick={() => setIsDeduction(true)}
            className="flex items-center gap-1"
          >
            <MinusCircle className="h-4 w-4" />
            Deduct Credits
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="amount">Amount</Label>
            <Input
              id="amount"
              type="number"
              min="1"
              placeholder="Enter amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="expiryDate">Expiry Date (Optional)</Label>
            <Input
              id="expiryDate"
              type="date"
              value={expiryDate}
              onChange={(e) => setExpiryDate(e.target.value)}
              min={new Date().toISOString().split("T")[0]}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="reason">Reason</Label>
          <Textarea
            id="reason"
            placeholder={
              isDeduction
                ? "e.g., Session booking, Subscription charge"
                : "e.g., Monthly allocation, Bonus credits, Promotional offer"
            }
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            required
            maxLength={200}
          />
        </div>

        {error && (
          <div className="rounded-md border border-destructive/40 bg-destructive/10 p-2 text-sm text-destructive">
            {error}
          </div>
        )}

        {success && (
          <div className="rounded-md border border-emerald-200 bg-emerald-50 p-2 text-sm text-emerald-700">
            {success}
          </div>
        )}

        <Button
          type="submit"
          disabled={isLoading}
          variant={isDeduction ? "destructive" : "default"}
        >
          {isLoading
            ? "Processing..."
            : isDeduction
            ? "Deduct Credits"
            : "Allocate Credits"}
        </Button>
      </form>
    </div>
  )
}
