export const notifyOptions = ["telegram", "whatsapp", "both"] as const

export type NotifyVia = (typeof notifyOptions)[number]
export type TrialStatus = "urgent" | "soon" | "safe" | "expired"

export type Trial = {
  id: string
  name: string
  url: string
  faviconUrl?: string | null
  imageUrl?: string | null
  trialEndDate: string
  notifyVia: NotifyVia
  createdAt: string
  cancelledAt?: string | null
}

const dayMs = 86_400_000
const dateKeyPattern = /^\d{4}-\d{2}-\d{2}$/

export function getTodayKey(date = new Date()) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")

  return `${year}-${month}-${day}`
}

export function isNotifyVia(value: string): value is NotifyVia {
  return notifyOptions.includes(value as NotifyVia)
}

export function parseDateKey(value: string) {
  if (!dateKeyPattern.test(value)) {
    throw new Error(`Invalid date key: ${value}`)
  }

  const [year, month, day] = value.split("-").map(Number)
  const timestamp = Date.UTC(year, month - 1, day)
  const parsed = new Date(timestamp)

  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== month - 1 ||
    parsed.getUTCDate() !== day
  ) {
    throw new Error(`Invalid date key: ${value}`)
  }

  return timestamp
}

export function getDaysRemaining(
  trialEndDate: string,
  todayKey = getTodayKey()
) {
  return Math.ceil((parseDateKey(trialEndDate) - parseDateKey(todayKey)) / dayMs)
}

export function getTrialStatus(daysRemaining: number): TrialStatus {
  if (daysRemaining <= 0) {
    return "expired"
  }

  if (daysRemaining <= 2) {
    return "urgent"
  }

  if (daysRemaining <= 6) {
    return "soon"
  }

  return "safe"
}

export function getTrialProgress(trial: Trial, todayKey = getTodayKey()) {
  const start = parseDateKey(trial.createdAt)
  const end = parseDateKey(trial.trialEndDate)
  const today = parseDateKey(todayKey)
  const totalDays = Math.max(1, Math.ceil((end - start) / dayMs))
  const remainingDays = Math.max(0, Math.min(totalDays, Math.ceil((end - today) / dayMs)))

  return Math.round((remainingDays / totalDays) * 100)
}

export function getHostname(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "")
  } catch {
    return url
  }
}

export function normalizeUrl(value: string) {
  const trimmed = value.trim()

  if (!trimmed) {
    throw new Error("Website URL is required.")
  }

  const withProtocol = /^https?:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`
  const url = new URL(withProtocol)

  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new Error("Use an HTTP or HTTPS URL.")
  }

  return url.toString()
}

export function assertNotifyVia(value: string): asserts value is NotifyVia {
  if (!isNotifyVia(value)) {
    throw new Error(`Invalid notification channel: ${value}`)
  }
}
