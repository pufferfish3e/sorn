import { parseRelativeDurationDate } from "@/lib/natural-duration"
import { getTodayKey, parseDateKey } from "@/lib/sorn"

const groqModel = "llama-3.1-8b-instant"
const groqChatCompletionsUrl = "https://api.groq.com/openai/v1/chat/completions"
const dayMs = 86_400_000

type GroqChatResponse = {
  choices?: Array<{
    message?: {
      content?: string
    }
  }>
}

export async function POST(request: Request) {
  const apiKey = process.env.GROQ_API_KEY

  if (!apiKey) {
    return Response.json(
      { error: "GROQ_API_KEY is not configured." },
      { status: 503 }
    )
  }

  let expression = ""
  let todayKey = getTodayKey()

  try {
    const payload: unknown = await request.json()

    if (!isRecord(payload) || typeof payload.text !== "string") {
      return Response.json({ error: "Date text is required." }, { status: 400 })
    }

    expression = payload.text.trim()

    if (typeof payload.today === "string") {
      parseDateKey(payload.today)
      todayKey = payload.today
    }
  } catch {
    return Response.json({ error: "Invalid request." }, { status: 400 })
  }

  if (!expression) {
    return Response.json({ error: "Date text is required." }, { status: 400 })
  }

  const explicitDuration = parseRelativeDurationDate(expression, todayKey)

  if (explicitDuration) {
    return Response.json({
      trial_end_date: explicitDuration.dateKey,
      days: explicitDuration.days,
      source: "duration",
    })
  }

  try {
    const response = await fetch(groqChatCompletionsUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      cache: "no-store",
      body: JSON.stringify({
        model: groqModel,
        messages: [
          {
            role: "system",
            content:
              "Parse natural-language free-trial durations or end dates. Return only JSON shaped like {\"date\":\"YYYY-MM-DD\",\"days\":number}. The date must be after today. Use the provided today date as the reference. No markdown.",
          },
          {
            role: "user",
            content: `Today: ${todayKey}\nInput: ${expression}`,
          },
        ],
        max_completion_tokens: 48,
        temperature: 0,
      }),
    })

    if (!response.ok) {
      return Response.json({ error: "Groq request failed." }, { status: 502 })
    }

    const data: GroqChatResponse = await response.json()
    const content = data.choices?.[0]?.message?.content ?? ""
    const parsed = readParsedDate(content)

    if (!parsed) {
      return Response.json({ error: "Date could not be parsed." }, { status: 422 })
    }

    const today = parseDateKey(todayKey)
    const parsedDate = parseDateKey(parsed.date)
    const computedDays = Math.ceil((parsedDate - today) / dayMs)

    if (computedDays <= 0) {
      return Response.json({ error: "Choose a future date." }, { status: 422 })
    }

    return Response.json({
      trial_end_date: parsed.date,
      days: computedDays,
      model: groqModel,
    })
  } catch {
    return Response.json({ error: "Date parsing unavailable." }, { status: 502 })
  }
}

function readParsedDate(content: string) {
  const match = content.trim().match(/\{[\s\S]*\}/)

  if (!match) {
    return null
  }

  try {
    const parsed: unknown = JSON.parse(match[0])

    if (
      isRecord(parsed) &&
      typeof parsed.date === "string" &&
      /^\d{4}-\d{2}-\d{2}$/.test(parsed.date)
    ) {
      return { date: parsed.date }
    }
  } catch {
    return null
  }

  return null
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}
