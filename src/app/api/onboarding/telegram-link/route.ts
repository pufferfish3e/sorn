import { auth } from "@clerk/nextjs/server"
import { createTelegramConnectionToken } from "@/lib/trial-store"

export async function POST() {
  const session = await auth()

  if (!session.userId) {
    return Response.json({ error: "Unauthorized." }, { status: 401 })
  }

  const username = getTelegramBotUsername()

  if (!username) {
    return Response.json(
      { error: "TELEGRAM_BOT_USERNAME is required." },
      { status: 500 }
    )
  }

  try {
    const token = await createTelegramConnectionToken(session.userId)

    return Response.json({
      token,
      link: `https://t.me/${username}?start=${token}`,
    })
  } catch {
    return Response.json(
      { error: "Unable to create Telegram setup link." },
      { status: 500 }
    )
  }
}

function getTelegramBotUsername() {
  const username =
    process.env.TELEGRAM_BOT_USERNAME?.trim() ||
    process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME?.trim() ||
    ""

  return username.replace(/^@/, "")
}
