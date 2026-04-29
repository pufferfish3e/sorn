import { auth } from "@clerk/nextjs/server"
import { deleteTrial, markTrialCancelled } from "@/lib/trial-store"

type RouteContext = {
  params: Promise<{ id: string }>
}

export async function PATCH(_request: Request, { params }: RouteContext) {
  const userId = await getUserId()

  if (!userId) {
    return unauthorized()
  }

  const { id } = await params

  try {
    await markTrialCancelled(userId, id)
    return Response.json({ ok: true })
  } catch {
    return Response.json({ error: "Unable to update trial." }, { status: 500 })
  }
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  const userId = await getUserId()

  if (!userId) {
    return unauthorized()
  }

  const { id } = await params

  try {
    await deleteTrial(userId, id)
    return new Response(null, { status: 204 })
  } catch {
    return Response.json({ error: "Unable to delete trial." }, { status: 500 })
  }
}

async function getUserId() {
  const session = await auth()
  return session.userId
}

function unauthorized() {
  return Response.json({ error: "Unauthorized." }, { status: 401 })
}
