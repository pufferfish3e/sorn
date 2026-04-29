import { parseDateKey } from "@/lib/sorn"

const dayMs = 86_400_000

export function parseRelativeDurationDate(text: string, todayKey: string) {
  const match = readDurationMatch(text)

  if (!match) {
    return null
  }

  const [, amountText, unitText] = match
  const amount = Number(amountText)

  if (!Number.isInteger(amount) || amount <= 0 || amount > 3650) {
    return null
  }

  const today = new Date(parseDateKey(todayKey))
  const unit = unitText.toLowerCase()
  const date = new Date(today)

  if (unit.startsWith("day")) {
    date.setUTCDate(date.getUTCDate() + amount)
  } else if (unit.startsWith("week")) {
    date.setUTCDate(date.getUTCDate() + amount * 7)
  } else if (unit.startsWith("month")) {
    date.setUTCMonth(date.getUTCMonth() + amount)
  } else if (unit.startsWith("year")) {
    date.setUTCFullYear(date.getUTCFullYear() + amount)
  } else {
    return null
  }

  const dateKey = dateToUtcKey(date)
  const days = Math.ceil((parseDateKey(dateKey) - parseDateKey(todayKey)) / dayMs)

  if (days <= 0) {
    return null
  }

  return { dateKey, days }
}

function readDurationMatch(text: string) {
  const explicitMatch = text.match(
    /\b(?:in|for|after)\s+(\d{1,4})\s*[-\s]?(days?|weeks?|months?|years?)\b/i
  )

  if (explicitMatch) {
    return explicitMatch
  }

  if (
    !/\b(?:trial|subscription|reminder|ends?|expires?|renews?|cancel|billing|billed|charged?)\b/i.test(
      text
    )
  ) {
    return null
  }

  return text.match(/\b(\d{1,4})\s*[-\s]?(days?|weeks?|months?|years?)\b/i)
}

function dateToUtcKey(date: Date) {
  const year = date.getUTCFullYear()
  const month = String(date.getUTCMonth() + 1).padStart(2, "0")
  const day = String(date.getUTCDate()).padStart(2, "0")

  return `${year}-${month}-${day}`
}
