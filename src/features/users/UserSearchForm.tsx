"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

export function UserSearchForm() {
  const router = useRouter()
  const params = useSearchParams()
  const current = params.get("q") || ""

  return (
    <form
      role="search"
      className="flex flex-wrap gap-2"
      onSubmit={(event) => {
        event.preventDefault()
        const form = event.currentTarget
        const formData = new FormData(form)
        const query = (formData.get("q") as string) || ""
        const url = query ? `/admin/users?q=${encodeURIComponent(query)}` : "/admin/users"
        router.push(url)
      }}
    >
      <Input name="q" type="search" placeholder="Search users" defaultValue={current} aria-label="Search users by name or email" />
      <Button type="submit" variant="outline" aria-label="Search">
        Search
      </Button>
      {current && (
        <Button type="button" variant="ghost" onClick={() => router.push("/admin/users")} aria-label="Clear search">
          Clear
        </Button>
      )}
    </form>
  )
}
