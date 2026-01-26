"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  createMyInvoicePaymentLink,
  getMyInvoiceById,
  getMyInvoices,
} from "@/app/actions/client-invoices"

export function useMyInvoices() {
  return useQuery({
    queryKey: ["my-invoices"],
    queryFn: () => getMyInvoices(),
  })
}

export function useMyInvoice(id?: number) {
  return useQuery({
    queryKey: ["my-invoice", id],
    queryFn: () => (id ? getMyInvoiceById(id) : null),
    enabled: Boolean(id),
  })
}

export function useCreateMyInvoicePaymentLink() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: number) => createMyInvoicePaymentLink(id),
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: ["my-invoice", id] })
      queryClient.invalidateQueries({ queryKey: ["my-invoices"] })
    },
  })
}
