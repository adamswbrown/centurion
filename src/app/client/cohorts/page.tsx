import { redirect } from "next/navigation"

export default function ClientCohortsRedirect() {
  redirect("/cohorts/me")
}
