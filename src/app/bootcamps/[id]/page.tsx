import { notFound } from "next/navigation"
import { AppLayout } from "@/components/layouts/AppLayout"
import { auth } from "@/auth"
import { requireCoach } from "@/lib/auth"
import { getBootcampById } from "@/app/actions/bootcamps"
import { getMembers } from "@/app/actions/members"
import { BootcampDetail } from "@/features/bootcamps/BootcampDetail"

interface BootcampPageProps {
  params: Promise<{ id: string }>
}

export default async function BootcampPage({ params }: BootcampPageProps) {
  await requireCoach()
  const session = await auth()

  if (!session) return null

  const { id } = await params
  const bootcampId = Number.parseInt(id, 10)

  if (Number.isNaN(bootcampId)) {
    notFound()
  }

  const bootcamp = await getBootcampById(bootcampId)
  if (!bootcamp) {
    notFound()
  }

  const members = await getMembers()

  return (
    <AppLayout session={session}>
      <BootcampDetail bootcamp={bootcamp} members={members} />
    </AppLayout>
  )
}
