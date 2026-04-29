import { auth } from "@clerk/nextjs/server"
import {
  normalizeTelegramChatTarget,
  sendTelegramMessage,
} from "@/lib/telegram"

export async function POST(request: Request) {
  const session = await auth()

  if (!session.userId) {
    return Response.json({ error: "Unauthorized." }, { status: 401 })
  }

  try {
    const payload: unknown = await request.json()

    if (!isRecord(payload) || typeof payload.telegram !== "string") {
      return Response.json({ error: "Invalid request." }, { status: 400 })
    }

    const chatId = normalizeTelegramChatTarget(payload.telegram)

    if (!chatId) {
      return Response.json(
        { error: "Telegram chat ID is required." },
        { status: 400 }
      )
    }

    await sendTelegramMessage({
      chatId,
      text: "Sorn Telegram test message. Trial reminders are ready.",
    })

    return Response.json({ ok: true })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to send Telegram test."
    return Response.json({ error: message }, { status: 400 })
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}
