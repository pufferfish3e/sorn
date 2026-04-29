import "server-only"

const telegramApiOrigin = "https://api.telegram.org"
const telegramTargetPattern = /^(?:-?\d{5,20}|@[A-Za-z0-9_]{5,32})$/

type SendTelegramMessageInput = {
  chatId: string
  text: string
}

export function normalizeTelegramChatTarget(value: string) {
  const target = value.trim()

  if (!target) {
    return ""
  }

  if (!telegramTargetPattern.test(target)) {
    throw new Error("Use a numeric Telegram chat ID or @channelusername.")
  }

  return target
}

export async function sendTelegramMessage({
  chatId,
  text,
}: SendTelegramMessageInput) {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim()

  if (!token) {
    throw new Error("TELEGRAM_BOT_TOKEN is required to send Telegram messages.")
  }

  const response = await fetch(
    `${telegramApiOrigin}/bot${token}/sendMessage`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        link_preview_options: { is_disabled: true },
      }),
    }
  )
  const payload: unknown = await response.json().catch(() => null)

  if (!response.ok || !isTelegramOkResponse(payload)) {
    const description = readTelegramDescription(payload)
    throw new Error(description || "Telegram rejected the message.")
  }
}

function isTelegramOkResponse(value: unknown): value is { ok: true } {
  return isRecord(value) && value.ok === true
}

function readTelegramDescription(value: unknown) {
  if (!isRecord(value) || typeof value.description !== "string") {
    return ""
  }

  return value.description
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}
