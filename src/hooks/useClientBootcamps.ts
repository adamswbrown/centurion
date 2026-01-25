import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  getAvailableBootcamps,
  registerForBootcamp,
  unregisterFromBootcamp,
} from "@/app/actions/client-bootcamps"

export function useAvailableBootcamps() {
  return useQuery({
    queryKey: ["available-bootcamps"],
    queryFn: () => getAvailableBootcamps(),
  })
}

export function useRegisterForBootcamp() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (bootcampId: number) => registerForBootcamp(bootcampId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["available-bootcamps"] })
    },
  })
}

export function useUnregisterFromBootcamp() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (bootcampId: number) => unregisterFromBootcamp(bootcampId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["available-bootcamps"] })
    },
  })
}
