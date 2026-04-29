import { generateWebsitePreview } from "@/lib/website-preview"

export async function POST(request: Request) {
  try {
    const payload: unknown = await request.json()

    if (!isRecord(payload) || typeof payload.url !== "string") {
      return Response.json({ error: "URL is required." }, { status: 400 })
    }

    const preview = await generateWebsitePreview(payload.url)

    return Response.json({
      service_name: preview.serviceName,
      favicon_url: preview.faviconUrl,
      image_url: preview.imageUrl,
      normalized_url: preview.normalizedUrl,
      domain: preview.domain,
    })
  } catch {
    return Response.json(
      { error: "Unable to generate website preview." },
      { status: 500 }
    )
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}
