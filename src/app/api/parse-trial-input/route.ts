import { parseRelativeDurationDate } from "@/lib/natural-duration"
import { getHostname, getTodayKey, normalizeUrl, parseDateKey } from "@/lib/sorn"

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

type ParsedTrialInput = {
  service_name: string
  url: string
  trial_end_date: string
}

export async function POST(request: Request) {
  const apiKey = process.env.GROQ_API_KEY

  if (!apiKey) {
    return Response.json(
      { error: "GROQ_API_KEY is not configured." },
      { status: 503 }
    )
  }

  let text = ""
  let todayKey = getTodayKey()

  try {
    const payload: unknown = await request.json()

    if (!isRecord(payload) || typeof payload.text !== "string") {
      return Response.json({ error: "Input text is required." }, { status: 400 })
    }

    text = payload.text.trim()

    if (typeof payload.today === "string") {
      parseDateKey(payload.today)
      todayKey = payload.today
    }
  } catch {
    return Response.json({ error: "Invalid request." }, { status: 400 })
  }

  if (!text) {
    return Response.json({ error: "Input text is required." }, { status: 400 })
  }

  try {
    const explicitDuration = parseRelativeDurationDate(text, todayKey)
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
              "Extract a free-trial reminder from natural text. Return only JSON with exactly these keys: service_name, url, trial_end_date. The url key is mandatory. If the user did not provide a URL, infer the most likely public homepage from service_name, such as https://www.figma.com for Figma. Use today as the date reference. trial_end_date must be after today. No markdown.",
          },
          {
            role: "user",
            content: `Today: ${todayKey}\nInput: ${text}`,
          },
        ],
        max_completion_tokens: 96,
        temperature: 0,
      }),
    })

    if (!response.ok) {
      return Response.json({ error: "Groq request failed." }, { status: 502 })
    }

    const data: GroqChatResponse = await response.json()
    const content = data.choices?.[0]?.message?.content ?? ""
    const parsed = readParsedTrialInput(
      content,
      text,
      explicitDuration?.dateKey ?? ""
    )

    if (!parsed) {
      return Response.json({ error: "Trial could not be parsed." }, { status: 422 })
    }

    const today = parseDateKey(todayKey)
    const trialEndDate = explicitDuration?.dateKey ?? parsed.trial_end_date
    const parsedDate = parseDateKey(trialEndDate)
    const days = Math.ceil((parsedDate - today) / dayMs)

    if (days <= 0) {
      return Response.json({ error: "Choose a future date." }, { status: 422 })
    }

    return Response.json({
      service_name: parsed.service_name,
      url: parsed.url,
      trial_end_date: trialEndDate,
      days,
      model: groqModel,
    })
  } catch {
    return Response.json({ error: "Trial parsing unavailable." }, { status: 502 })
  }
}

function readParsedTrialInput(
  content: string,
  sourceText: string,
  fallbackTrialEndDate: string
): ParsedTrialInput | null {
  const match = content.trim().match(/\{[\s\S]*\}/)

  if (!match) {
    return null
  }

  try {
    const parsed: unknown = JSON.parse(match[0])

    if (!isRecord(parsed)) {
      return null
    }

    const rawUrl =
      typeof parsed.url === "string" && parsed.url.trim()
        ? parsed.url
        : readUrlFromText(sourceText)
    let url = normalizeCandidateUrl(rawUrl)
    const serviceName =
      sanitizeName(readString(parsed.service_name)) ||
      sanitizeName(readString(parsed.serviceName)) ||
      sanitizeName(readString(parsed.name)) ||
      (url ? getServiceNameFromUrl(url) : "")

    if (!url && serviceName) {
      url = inferHomepageUrlFromName(serviceName)
    }

    const trialEndDate =
      readString(parsed.trial_end_date) ||
      readString(parsed.trialEndDate) ||
      readString(parsed.date) ||
      fallbackTrialEndDate

    if (!serviceName || !url) {
      return null
    }

    parseDateKey(trialEndDate)

    return {
      service_name: serviceName,
      url,
      trial_end_date: trialEndDate,
    }
  } catch {
    return null
  }
}

function readUrlFromText(value: string) {
  const match = value.match(
    /\b(?:https?:\/\/[^\s"'<>]+|(?:[a-z0-9-]+\.)+[a-z]{2,}(?:\/[^\s"'<>]*)?)/i
  )

  if (!match) {
    return ""
  }

  return match[0].replace(/[),.;:!?]+$/g, "")
}

function normalizeCandidateUrl(value: string) {
  if (!value) {
    return ""
  }

  try {
    const url = normalizeUrl(value)
    const hostname = getHostname(url)

    if (!hostname.includes(".") && !hostname.startsWith("localhost")) {
      return ""
    }

    return url
  } catch {
    return ""
  }
}

function inferHomepageUrlFromName(value: string) {
  const slug = value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "")

  if (!slug) {
    return ""
  }

  return normalizeUrl(`${slug}.com`)
}

function getServiceNameFromUrl(url: string) {
  const hostname = getHostname(url)
  const parts = hostname.split(".").filter(Boolean)
  const meaningfulPart = parts.length > 1 ? parts.at(-2) : parts[0]

  if (!meaningfulPart) {
    return sanitizeName(hostname) || "Trial"
  }

  return sanitizeName(
    meaningfulPart
      .split(/[-_]+/)
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ")
  )
}

function readString(value: unknown) {
  return typeof value === "string" ? value : ""
}

function sanitizeName(value: string) {
  return value.replace(/\s+/g, " ").trim().slice(0, 80)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}
