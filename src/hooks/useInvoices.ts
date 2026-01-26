"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { PaymentStatus } from "@prisma/client"

import {
  createManualInvoice,
  createStripePaymentLink,
  deleteInvoice,
  generateInvoice,
  getInvoiceById,
  getInvoices,
  getRevenueStats,
  updateInvoicePaymentStatus,
  type CreateManualInvoiceInput,
  type GenerateInvoiceInput,
} from "@/app/actions/invoices"

export function useInvoices(params?: {
  userId?: number
  status?: PaymentStatus
  year?: number
}) {
  return useQuery({
    queryKey: ["invoices", params],
    queryFn: () => getInvoices(params),
  })
}

export function useInvoice(id: number) {
  return useQuery({
    queryKey: ["invoice", id],
    queryFn: () => getInvoiceById(id),
    enabled: !!id,
  })
}

export function useRevenueStats(year: number) {
  return useQuery({
    queryKey: ["revenue-stats", year],
    queryFn: () => getRevenueStats(year),
    enabled: !!year,
  })
}

export function useGenerateInvoice() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: GenerateInvoiceInput) => generateInvoice(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] })
      queryClient.invalidateQueries({ queryKey: ["appointments"] })
    },
  })
}

export function useCreateManualInvoice() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: CreateManualInvoiceInput) =>
      createManualInvoice(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] })
    },
  })
}

export function useCreatePaymentLink() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (invoiceId: number) => createStripePaymentLink(invoiceId),
    onSuccess: (_result, invoiceId) => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] })
      queryClient.invalidateQueries({ queryKey: ["invoice", invoiceId] })
    },
  })
}

export function useUpdateInvoiceStatus() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, status }: { id: number; status: PaymentStatus }) =>
      updateInvoicePaymentStatus(id, status),
    onSuccess: (_result, { id }) => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] })
      queryClient.invalidateQueries({ queryKey: ["invoice", id] })
      queryClient.invalidateQueries({ queryKey: ["revenue-stats"] })
    },
  })
}

export function useDeleteInvoice() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: number) => deleteInvoice(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] })
      queryClient.invalidateQueries({ queryKey: ["appointments"] })
    },
  })
}
