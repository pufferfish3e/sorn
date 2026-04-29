import { auth } from "@clerk/nextjs/server"
import { getTelegramConnectionStatus } from "@/lib/trial-store"

export async function POST(request: Request) {
  const session = await auth()

  if (!session.userId) {
    return Response.json({ error: "Unauthorized." }, { status: 401 })
  }

  try {
    const payload: unknown = await request.json()

    if (!isRecord(payload) || typeof payload.token !== "string") {
      return Response.json({ error: "Invalid request." }, { status: 400 })
    }

    const status = await getTelegramConnectionStatus({
      userId: session.userId,
      token: payload.token,
    })

    return Response.json(status)
  } catch {
    return Response.json(
      { error: "Unable to read Telegram setup status." },
      { status: 500 }
    )
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}
