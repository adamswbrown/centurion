import { redirect } from "next/navigation"

export default function ClientInvoicesRedirect() {
  redirect("/invoices/me")
}
