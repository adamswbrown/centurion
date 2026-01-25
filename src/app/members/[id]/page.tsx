import { notFound } from "next/navigation"
import { requireCoach } from "@/lib/auth"
import { auth } from "@/auth"
import { AppLayout } from "@/components/layouts/AppLayout"
import { MemberDetail } from "@/features/members/MemberDetail"
import { getMemberById } from "@/app/actions/members"

interface MemberPageProps {
  params: Promise<{ id: string }>
}

export default async function MemberPage({ params }: MemberPageProps) {
  await requireCoach()
  const session = await auth()

  if (!session) return null

  const { id } = await params
  const memberId = parseInt(id, 10)

  if (isNaN(memberId)) {
    notFound()
  }

  const member = await getMemberById(memberId)

  if (!member) {
    notFound()
  }

  return (
    <AppLayout session={session}>
      <MemberDetail member={member} />
    </AppLayout>
  )
}
