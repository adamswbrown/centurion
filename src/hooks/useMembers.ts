import { useQuery } from "@tanstack/react-query"
import { getMembers } from "@/app/actions/members"

export function useMembers() {
  return useQuery({
    queryKey: ["members"],
    queryFn: () => getMembers(),
  })
}
