import { auth } from "@clerk/nextjs/server"
import {
  getReminderContacts,
  saveReminderContacts,
} from "@/lib/trial-store"
import { normalizeTelegramChatTarget } from "@/lib/telegram"

export async function GET() {
  const userId = await getUserId()

  if (!userId) {
    return unauthorized()
  }

  try {
    const contacts = await getReminderContacts(userId)
    return Response.json({ contacts })
  } catch {
    return Response.json(
      { error: "Unable to load reminder contacts." },
      { status: 500 }
    )
  }
}

export async function PUT(request: Request) {
  const userId = await getUserId()

  if (!userId) {
    return unauthorized()
  }

  try {
    const payload: unknown = await request.json()

    if (!isRecord(payload)) {
      return Response.json({ error: "Invalid request." }, { status: 400 })
    }

    const telegramInput =
      typeof payload.telegram === "string" ? payload.telegram : ""
    const telegram = readTelegramContact(telegramInput)
    const whatsapp =
      typeof payload.whatsapp === "string" ? payload.whatsapp.trim() : ""

    await saveReminderContacts({ userId, telegram, whatsapp })

    return Response.json({ contacts: { telegram, whatsapp } })
  } catch (error) {
    if (error instanceof ContactValidationError) {
      return Response.json({ error: error.message }, { status: 400 })
    }

    return Response.json(
      { error: "Unable to save reminder contacts." },
      { status: 500 }
    )
  }
}

async function getUserId() {
  const session = await auth()
  return session.userId
}

function unauthorized() {
  return Response.json({ error: "Unauthorized." }, { status: 401 })
}

function readTelegramContact(value: string) {
  try {
    return normalizeTelegramChatTarget(value)
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Invalid Telegram contact."
    throw new ContactValidationError(message)
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

class ContactValidationError extends Error {}
