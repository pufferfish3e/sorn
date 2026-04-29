import { getHostname, normalizeUrl } from "@/lib/sorn"

const groqModel = "llama-3.1-8b-instant"
const groqChatCompletionsUrl = "https://api.groq.com/openai/v1/chat/completions"

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
    return Response.json({ error: "GROQ_API_KEY is not configured." }, { status: 503 })
  }

  let url = ""

  try {
    const payload: unknown = await request.json()

    if (!isRecord(payload) || typeof payload.url !== "string") {
      return Response.json({ error: "URL is required." }, { status: 400 })
    }

    url = normalizeUrl(payload.url)
  } catch {
    return Response.json({ error: "Invalid request." }, { status: 400 })
  }

  const hostname = getHostname(url)

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
              "Infer the public-facing product or company name from a website URL. Return only JSON shaped like {\"name\":\"Name\"}. No markdown.",
          },
          {
            role: "user",
            content: `URL: ${url}\nHostname: ${hostname}`,
          },
        ],
        max_completion_tokens: 24,
        temperature: 0,
      }),
    })

    if (!response.ok) {
      return Response.json({ error: "Groq request failed." }, { status: 502 })
    }

    const data: GroqChatResponse = await response.json()
    const content = data.choices?.[0]?.message?.content ?? ""
    const name = sanitizeName(readName(content))

    if (!name) {
      return Response.json({ error: "No name inferred." }, { status: 422 })
    }

    return Response.json({ name, model: groqModel })
  } catch {
    return Response.json({ error: "Name inference unavailable." }, { status: 502 })
  }
}

function readName(content: string) {
  const trimmed = content.trim()

  try {
    const parsed: unknown = JSON.parse(trimmed)

    if (isRecord(parsed) && typeof parsed.name === "string") {
      return parsed.name
    }
  } catch {
    return trimmed
  }

  return trimmed
}

function sanitizeName(value: string) {
  return value
    .replace(/^["'`]+|["'`]+$/g, "")
    .replace(/[{}[\]]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 48)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}
