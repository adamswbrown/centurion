import { useQuery } from "@tanstack/react-query"

export function useUnifiedCalendar({ from, to }: { from: Date; to: Date }) {
  return useQuery({
    queryKey: ["unified-calendar", from.toISOString(), to.toISOString()],
    queryFn: async () => {
      const params = new URLSearchParams({ from: from.toISOString(), to: to.toISOString() })
      const res = await fetch(`/api/calendar/events?${params}`)
      if (!res.ok) throw new Error("Failed to fetch calendar events")
      return res.json()
    },
  })
}
