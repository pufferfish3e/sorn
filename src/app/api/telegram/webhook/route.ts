import { completeTelegramConnectionToken } from "@/lib/trial-store"
import { sendTelegramMessage } from "@/lib/telegram"

type TelegramMessage = {
  chat?: {
    id?: number | string
  }
  text?: string
}

export async function POST(request: Request) {
  if (!isValidTelegramRequest(request)) {
    return Response.json({ error: "Unauthorized." }, { status: 401 })
  }

  try {
    const payload: unknown = await request.json()
    const message = readTelegramMessage(payload)
    const chatId = readChatId(message)
    const token = readStartToken(message?.text)

    if (!chatId || !token) {
      return Response.json({ ok: true })
    }

    const connection = await completeTelegramConnectionToken({ token, chatId })

    if (connection) {
      await sendTelegramMessage({
        chatId,
        text: "Sorn is connected. Trial reminders will arrive here.",
      })
    } else {
      await sendTelegramMessage({
        chatId,
        text: "That Sorn setup link expired. Open Sorn and create a fresh Telegram link.",
      })
    }

    return Response.json({ ok: true })
  } catch (error) {
    console.error("Unable to process Telegram webhook update.", error)
    return Response.json({ ok: true })
  }
}

function isValidTelegramRequest(request: Request) {
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET?.trim()

  if (!secret) {
    return true
  }

  return request.headers.get("x-telegram-bot-api-secret-token") === secret
}

function readTelegramMessage(value: unknown): TelegramMessage | null {
  if (!isRecord(value)) {
    return null
  }

  const message = value.message

  if (!isRecord(message)) {
    return null
  }

  return message
}

function readChatId(message: TelegramMessage | null) {
  const chatId = message?.chat?.id

  if (typeof chatId !== "number" && typeof chatId !== "string") {
    return ""
  }

  return String(chatId)
}

function readStartToken(text: string | undefined) {
  if (!text) {
    return ""
  }

  const [command, token] = text.trim().split(/\s+/, 2)

  if (!/^\/start(?:@[A-Za-z0-9_]{5,32})?$/.test(command)) {
    return ""
  }

  if (!token || !/^[A-Za-z0-9_-]{16,64}$/.test(token)) {
    return ""
  }

  return token
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}
