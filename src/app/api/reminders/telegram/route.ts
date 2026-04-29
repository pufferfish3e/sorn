import { dispatchDueTelegramReminders } from "@/lib/reminder-dispatch"

export async function GET(request: Request) {
  return handleTelegramReminderDispatch(request)
}

export async function POST(request: Request) {
  return handleTelegramReminderDispatch(request)
}

async function handleTelegramReminderDispatch(request: Request) {
  const secret = getCronSecret()

  if (!secret) {
    return Response.json(
      { error: "CRON_SECRET is required for reminder dispatch." },
      { status: 500 }
    )
  }

  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ error: "Unauthorized." }, { status: 401 })
  }

  try {
    const result = await dispatchDueTelegramReminders()
    return Response.json({ ok: true, ...result })
  } catch {
    return Response.json(
      { error: "Unable to dispatch Telegram reminders." },
      { status: 500 }
    )
  }
}

function getCronSecret() {
  return (
    process.env.SORN_REMINDER_CRON_SECRET?.trim() ||
    process.env.CRON_SECRET?.trim() ||
    ""
  )
}
