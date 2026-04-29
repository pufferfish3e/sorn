import { auth } from "@clerk/nextjs/server"
import {
  createTrial,
  getReminderContacts,
  listTrials,
} from "@/lib/trial-store"
import {
  getDaysRemaining,
  isNotifyVia,
  normalizeUrl,
  type NotifyVia,
} from "@/lib/sorn"

export async function GET() {
  const userId = await getUserId()

  if (!userId) {
    return unauthorized()
  }

  try {
    const [trials, contacts] = await Promise.all([
      listTrials(userId),
      getReminderContacts(userId),
    ])

    return Response.json({ trials, contacts })
  } catch {
    return Response.json({ error: "Unable to load trials." }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const userId = await getUserId()

  if (!userId) {
    return unauthorized()
  }

  try {
    const payload: unknown = await request.json()

    if (!isRecord(payload)) {
      return Response.json({ error: "Invalid request." }, { status: 400 })
    }

    const name = typeof payload.name === "string" ? payload.name.trim() : ""
    const url = typeof payload.url === "string" ? normalizeUrl(payload.url) : ""
    const faviconUrl =
      typeof payload.faviconUrl === "string" ? payload.faviconUrl : null
    const imageUrl =
      typeof payload.imageUrl === "string" ? payload.imageUrl : null
    const trialEndDate =
      typeof payload.trialEndDate === "string" ? payload.trialEndDate : ""
    const notifyVia = readNotifyVia(payload.notifyVia)

    if (!name) {
      return Response.json({ error: "Name is required." }, { status: 400 })
    }

    if (getDaysRemaining(trialEndDate) <= 0) {
      return Response.json(
        { error: "Trial end date must be in the future." },
        { status: 400 }
      )
    }

    const trial = await createTrial({
      userId,
      name: name.slice(0, 80),
      url,
      faviconUrl,
      imageUrl,
      trialEndDate,
      notifyVia,
    })

    return Response.json({ trial }, { status: 201 })
  } catch {
    return Response.json({ error: "Unable to create trial." }, { status: 500 })
  }
}

async function getUserId() {
  const session = await auth()
  return session.userId
}

function readNotifyVia(value: unknown): NotifyVia {
  return typeof value === "string" && isNotifyVia(value) ? value : "telegram"
}

function unauthorized() {
  return Response.json({ error: "Unauthorized." }, { status: 401 })
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}
