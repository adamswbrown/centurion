import { getUnifiedEvents } from "@/app/actions/bootcamps"
import { getCurrentUser } from "@/lib/auth"

// API route for unified calendar events (appointments + bootcamps)
export async function GET(req: Request) {
  const user = await getCurrentUser()
  if (!user) return new Response("Unauthorized", { status: 401 })
  const { from, to } = Object.fromEntries(new URL(req.url).searchParams)
  if (!from || !to) return new Response("Missing date range", { status: 400 })
  const events = await getUnifiedEvents({ userId: Number.parseInt(user.id, 10), from: new Date(from), to: new Date(to) })
  return Response.json(events)
}
