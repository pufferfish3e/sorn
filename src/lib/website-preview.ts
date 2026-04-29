import "server-only"

import { getHostname, normalizeUrl } from "@/lib/sorn"
import { getTursoClient } from "@/lib/turso"

export type WebsitePreview = {
  serviceName: string
  faviconUrl: string
  imageUrl: string
  normalizedUrl: string
  domain: string
}

const picsumBannerSize = "900/320"

const previewSchema = `CREATE TABLE IF NOT EXISTS website_previews (
  domain TEXT PRIMARY KEY,
  normalized_url TEXT NOT NULL,
  service_name TEXT NOT NULL,
  favicon_url TEXT NOT NULL,
  image_url TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
)`

export async function generateWebsitePreview(value: string) {
  const normalizedUrl = getPreviewRootUrl(value)
  const domain = getHostname(normalizedUrl)
  const cached = await getCachedWebsitePreview(domain)

  if (cached) {
    return {
      ...cached,
      normalizedUrl,
    } satisfies WebsitePreview
  }

  const fetched = await fetchWebsitePreview(normalizedUrl, domain)
  await saveWebsitePreview(fetched)

  return fetched
}

function getPreviewRootUrl(value: string) {
  const normalizedUrl = normalizeUrl(value)
  const url = new URL(normalizedUrl)

  url.pathname = "/"
  url.search = ""
  url.hash = ""

  return url.toString()
}

async function getCachedWebsitePreview(domain: string) {
  await ensurePreviewSchema()

  const result = await getTursoClient().execute({
    sql: `SELECT domain, normalized_url, service_name, favicon_url, image_url
      FROM website_previews
      WHERE domain = ?`,
    args: [domain],
  })

  const row = result.rows[0]

  if (!row) {
    return null
  }

  return {
    domain: String(row.domain),
    normalizedUrl: String(row.normalized_url),
    serviceName: String(row.service_name),
    faviconUrl: String(row.favicon_url),
    imageUrl: String(row.image_url),
  } satisfies WebsitePreview
}

async function fetchWebsitePreview(
  normalizedUrl: string,
  domain: string
): Promise<WebsitePreview> {
  const html = await fetchHtml(normalizedUrl)
  const serviceName =
    extractMeta(html, "property", "og:site_name") ||
    extractMeta(html, "name", "application-name") ||
    extractTitle(html) ||
    toServiceName(domain)
  const ogImage = extractMeta(html, "property", "og:image")
  const favicon =
    extractFavicon(html, normalizedUrl) ||
    `https://www.google.com/s2/favicons?domain=${domain}&sz=64`

  return {
    domain,
    normalizedUrl,
    serviceName: cleanServiceName(serviceName),
    faviconUrl: favicon,
    imageUrl: ogImage
      ? resolveUrl(ogImage, normalizedUrl)
      : getPicsumPlaceholder(domain),
  }
}

function getPicsumPlaceholder(domain: string) {
  return `https://picsum.photos/seed/${encodeURIComponent(domain)}/${picsumBannerSize}`
}

async function saveWebsitePreview(preview: WebsitePreview) {
  await ensurePreviewSchema()

  await getTursoClient().execute({
    sql: `INSERT INTO website_previews (
        domain, normalized_url, service_name, favicon_url, image_url, updated_at
      ) VALUES (?, ?, ?, ?, ?, datetime('now'))
      ON CONFLICT(domain) DO UPDATE SET
        normalized_url = excluded.normalized_url,
        service_name = excluded.service_name,
        favicon_url = excluded.favicon_url,
        image_url = excluded.image_url,
        updated_at = excluded.updated_at`,
    args: [
      preview.domain,
      preview.normalizedUrl,
      preview.serviceName,
      preview.faviconUrl,
      preview.imageUrl,
    ],
  })
}

async function ensurePreviewSchema() {
  await getTursoClient().execute(previewSchema)
}

async function fetchHtml(url: string) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 5_000)

  try {
    const response = await fetch(url, {
      headers: {
        Accept: "text/html,application/xhtml+xml",
        "User-Agent": "SornPreviewBot/1.0",
      },
      redirect: "follow",
      signal: controller.signal,
    })

    if (!response.ok) {
      return ""
    }

    return await response.text()
  } catch {
    return ""
  } finally {
    clearTimeout(timeout)
  }
}

function extractMeta(html: string, attribute: "property" | "name", value: string) {
  const pattern = new RegExp(`<meta\\s+[^>]*${attribute}=["']${escapeRegExp(value)}["'][^>]*>`, "i")
  const reversePattern = new RegExp(`<meta\\s+[^>]*content=["']([^"']+)["'][^>]*${attribute}=["']${escapeRegExp(value)}["'][^>]*>`, "i")
  const tag = html.match(pattern)?.[0]
  const content = tag?.match(/\scontent=["']([^"']+)["']/i)?.[1]

  return decodeHtml(content || html.match(reversePattern)?.[1] || "")
}

function extractTitle(html: string) {
  return decodeHtml(html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1] || "")
}

function extractFavicon(html: string, baseUrl: string) {
  const links = [...html.matchAll(/<link\s+[^>]*>/gi)].map((match) => match[0])
  const rels = ["icon", "shortcut icon", "apple-touch-icon"]

  for (const rel of rels) {
    const link = links.find((item) => {
      const value = item.match(/\srel=["']([^"']+)["']/i)?.[1]
      return value?.toLowerCase().split(/\s+/).join(" ") === rel
    })
    const href = link?.match(/\shref=["']([^"']+)["']/i)?.[1]

    if (href) {
      return resolveUrl(decodeHtml(href), baseUrl)
    }
  }

  return ""
}

function resolveUrl(value: string, baseUrl: string) {
  try {
    return new URL(value, baseUrl).toString()
  } catch {
    return value
  }
}

function toServiceName(domain: string) {
  return domain
    .split(".")
    .filter(Boolean)
    .at(-2)
    ?.split(/[-_]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ") || domain
}

function cleanServiceName(value: string) {
  return value
    .replace(/\s*[|·-]\s*(official site|home|login).*$/i, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80)
}

function decodeHtml(value: string) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .trim()
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}
