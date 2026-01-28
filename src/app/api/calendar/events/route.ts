import { getCurrentUser } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// API route for unified calendar events (appointments + sessions)
export async function GET(req: Request) {
  const user = await getCurrentUser()
  if (!user) return new Response("Unauthorized", { status: 401 })
  const { from, to } = Object.fromEntries(new URL(req.url).searchParams)
  if (!from || !to) return new Response("Missing date range", { status: 400 })

  const userId = Number.parseInt(user.id, 10)
  const fromDate = new Date(from)
  const toDate = new Date(to)

  const [appointments, sessions] = await Promise.all([
    prisma.appointment.findMany({
      where: {
        OR: [{ userId }, { coachId: userId }],
        startTime: { gte: fromDate, lt: toDate },
      },
      select: {
        id: true,
        title: true,
        startTime: true,
        endTime: true,
      },
    }),
    prisma.classSession.findMany({
      where: {
        status: "SCHEDULED",
        startTime: { gte: fromDate, lt: toDate },
      },
      select: {
        id: true,
        title: true,
        startTime: true,
        endTime: true,
        classType: { select: { name: true, color: true } },
      },
    }),
  ])

  return Response.json({ appointments, sessions })
}
