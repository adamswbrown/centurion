import { redirect } from "next/navigation"

export default function ClientAppointmentsRedirect() {
  redirect("/appointments/me")
}
