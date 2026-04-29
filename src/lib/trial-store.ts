import "server-only"

import {
  getTodayKey,
  parseDateKey,
  type NotifyVia,
  type Trial,
} from "@/lib/sorn"
import { getTursoClient } from "@/lib/turso"

type CreateTrialInput = {
  userId: string
  name: string
  url: string
  faviconUrl?: string | null
  imageUrl?: string | null
  trialEndDate: string
  notifyVia: NotifyVia
}

export type ReminderContacts = {
  telegram: string
  whatsapp: string
}

export type DueTelegramReminder = Trial & {
  userId: string
  telegramChatId: string
}

const dayMs = 86_400_000
const telegramConnectionTokenPattern = /^[A-Za-z0-9_-]{16,64}$/

const schema = [
  `CREATE TABLE IF NOT EXISTS trials (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    url TEXT NOT NULL,
    favicon_url TEXT,
    image_url TEXT,
    trial_end_date TEXT NOT NULL,
    notify_via TEXT NOT NULL CHECK (notify_via IN ('whatsapp', 'telegram', 'both')),
    cancelled_at TEXT,
    reminder_sent_at TEXT,
    created_at TEXT NOT NULL DEFAULT (date('now'))
  )`,
  `CREATE INDEX IF NOT EXISTS trials_user_end_date_idx
    ON trials (user_id, trial_end_date)`,
  `CREATE TABLE IF NOT EXISTS reminder_contacts (
    user_id TEXT PRIMARY KEY,
    telegram TEXT,
    whatsapp TEXT,
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
  `CREATE TABLE IF NOT EXISTS website_previews (
    domain TEXT PRIMARY KEY,
    normalized_url TEXT NOT NULL,
    service_name TEXT NOT NULL,
    favicon_url TEXT NOT NULL,
    image_url TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
  `CREATE TABLE IF NOT EXISTS telegram_connection_tokens (
    token TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    chat_id TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    expires_at TEXT NOT NULL,
    completed_at TEXT
  )`,
  `CREATE INDEX IF NOT EXISTS telegram_connection_tokens_user_idx
    ON telegram_connection_tokens (user_id, created_at)`,
]

export async function ensureTrialSchema() {
  const client = getTursoClient()

  await client.batch(schema, "write")
  await addColumnIfMissing("trials", "favicon_url", "TEXT")
  await addColumnIfMissing("trials", "image_url", "TEXT")
  await addColumnIfMissing("trials", "reminder_sent_at", "TEXT")
}

export async function listTrials(userId: string): Promise<Trial[]> {
  await ensureTrialSchema()

  const result = await getTursoClient().execute({
    sql: `SELECT id, name, url, favicon_url, image_url, trial_end_date, notify_via, created_at, cancelled_at
      FROM trials
      WHERE user_id = ?
      ORDER BY trial_end_date ASC`,
    args: [userId],
  })

  return result.rows.map((row) => ({
    id: String(row.id),
    name: String(row.name),
    url: String(row.url),
    faviconUrl: row.favicon_url ? String(row.favicon_url) : null,
    imageUrl: row.image_url ? String(row.image_url) : null,
    trialEndDate: String(row.trial_end_date),
    notifyVia: row.notify_via as NotifyVia,
    createdAt: String(row.created_at ?? getTodayKey()),
    cancelledAt: row.cancelled_at ? String(row.cancelled_at) : null,
  }))
}

export async function createTrial(input: CreateTrialInput) {
  await ensureTrialSchema()

  const trial: Trial = {
    id: crypto.randomUUID(),
    name: input.name,
    url: input.url,
    faviconUrl: input.faviconUrl ?? null,
    imageUrl: input.imageUrl ?? null,
    trialEndDate: input.trialEndDate,
    notifyVia: input.notifyVia,
    createdAt: getTodayKey(),
    cancelledAt: null,
  }

  await getTursoClient().execute({
    sql: `INSERT INTO trials (
        id, user_id, name, url, favicon_url, image_url, trial_end_date, notify_via, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      trial.id,
      input.userId,
      trial.name,
      trial.url,
      trial.faviconUrl ?? null,
      trial.imageUrl ?? null,
      trial.trialEndDate,
      trial.notifyVia,
      trial.createdAt,
    ],
  })

  return trial
}

export async function markTrialCancelled(userId: string, trialId: string) {
  await ensureTrialSchema()

  await getTursoClient().execute({
    sql: `UPDATE trials
      SET cancelled_at = datetime('now')
      WHERE user_id = ? AND id = ?`,
    args: [userId, trialId],
  })
}

export async function deleteTrial(userId: string, trialId: string) {
  await ensureTrialSchema()

  await getTursoClient().execute({
    sql: "DELETE FROM trials WHERE user_id = ? AND id = ?",
    args: [userId, trialId],
  })
}

export async function listDueTelegramReminders(todayKey = getTodayKey()) {
  await ensureTrialSchema()

  const reminderDate = addDaysToDateKey(todayKey, 1)
  const result = await getTursoClient().execute({
    sql: `SELECT
        t.id,
        t.user_id,
        t.name,
        t.url,
        t.favicon_url,
        t.image_url,
        t.trial_end_date,
        t.notify_via,
        t.created_at,
        t.cancelled_at,
        c.telegram
      FROM trials t
      INNER JOIN reminder_contacts c ON c.user_id = t.user_id
      WHERE t.cancelled_at IS NULL
        AND t.reminder_sent_at IS NULL
        AND t.notify_via IN ('telegram', 'both')
        AND t.trial_end_date = ?
        AND c.telegram IS NOT NULL
        AND trim(c.telegram) <> ''
      ORDER BY t.trial_end_date ASC, t.created_at ASC`,
    args: [reminderDate],
  })

  return result.rows.map((row): DueTelegramReminder => ({
    id: String(row.id),
    userId: String(row.user_id),
    name: String(row.name),
    url: String(row.url),
    faviconUrl: row.favicon_url ? String(row.favicon_url) : null,
    imageUrl: row.image_url ? String(row.image_url) : null,
    trialEndDate: String(row.trial_end_date),
    notifyVia: row.notify_via as NotifyVia,
    createdAt: String(row.created_at ?? getTodayKey()),
    cancelledAt: row.cancelled_at ? String(row.cancelled_at) : null,
    telegramChatId: String(row.telegram),
  }))
}

export async function markTrialReminderSent(userId: string, trialId: string) {
  await ensureTrialSchema()

  await getTursoClient().execute({
    sql: `UPDATE trials
      SET reminder_sent_at = datetime('now')
      WHERE user_id = ? AND id = ? AND reminder_sent_at IS NULL`,
    args: [userId, trialId],
  })
}

export async function getReminderContacts(
  userId: string
): Promise<ReminderContacts> {
  await ensureTrialSchema()

  const result = await getTursoClient().execute({
    sql: "SELECT telegram, whatsapp FROM reminder_contacts WHERE user_id = ?",
    args: [userId],
  })

  const row = result.rows[0]

  if (!row) {
    return { telegram: "", whatsapp: "" }
  }

  return {
    telegram: typeof row.telegram === "string" ? row.telegram : "",
    whatsapp: typeof row.whatsapp === "string" ? row.whatsapp : "",
  }
}

export async function saveReminderContacts({
  userId,
  telegram,
  whatsapp,
}: {
  userId: string
  telegram: string
  whatsapp: string
}) {
  await ensureTrialSchema()

  await getTursoClient().execute({
    sql: `INSERT INTO reminder_contacts (user_id, telegram, whatsapp, updated_at)
      VALUES (?, ?, ?, datetime('now'))
      ON CONFLICT(user_id) DO UPDATE SET
        telegram = excluded.telegram,
        whatsapp = excluded.whatsapp,
        updated_at = excluded.updated_at`,
    args: [userId, telegram, whatsapp],
  })
}

export async function createTelegramConnectionToken(userId: string) {
  await ensureTrialSchema()

  const token = crypto.randomUUID().replace(/-/g, "")

  await getTursoClient().execute({
    sql: `INSERT INTO telegram_connection_tokens (token, user_id, expires_at)
      VALUES (?, ?, datetime('now', '+30 minutes'))`,
    args: [token, userId],
  })

  return token
}

export async function completeTelegramConnectionToken({
  token,
  chatId,
}: {
  token: string
  chatId: string
}) {
  await ensureTrialSchema()

  if (!telegramConnectionTokenPattern.test(token)) {
    return null
  }

  const client = getTursoClient()
  const result = await client.execute({
    sql: `SELECT user_id
      FROM telegram_connection_tokens
      WHERE token = ?
        AND completed_at IS NULL
        AND expires_at > datetime('now')`,
    args: [token],
  })
  const row = result.rows[0]

  if (!row) {
    return null
  }

  const userId = String(row.user_id)
  const contacts = await getReminderContacts(userId)

  await saveReminderContacts({
    userId,
    telegram: chatId,
    whatsapp: contacts.whatsapp,
  })
  await client.execute({
    sql: `UPDATE telegram_connection_tokens
      SET chat_id = ?, completed_at = datetime('now')
      WHERE token = ?`,
    args: [chatId, token],
  })

  return { userId }
}

export async function getTelegramConnectionStatus({
  userId,
  token,
}: {
  userId: string
  token: string
}) {
  await ensureTrialSchema()

  if (!telegramConnectionTokenPattern.test(token)) {
    return { status: "expired" as const, telegram: "" }
  }

  const result = await getTursoClient().execute({
    sql: `SELECT chat_id, completed_at, expires_at <= datetime('now') AS expired
      FROM telegram_connection_tokens
      WHERE user_id = ? AND token = ?`,
    args: [userId, token],
  })
  const row = result.rows[0]

  if (!row || readSqlBoolean(row.expired)) {
    return { status: "expired" as const, telegram: "" }
  }

  if (row.completed_at && row.chat_id) {
    return { status: "connected" as const, telegram: String(row.chat_id) }
  }

  return { status: "pending" as const, telegram: "" }
}

async function addColumnIfMissing(
  tableName: string,
  columnName: string,
  columnType: string
) {
  const client = getTursoClient()
  const result = await client.execute(`PRAGMA table_info(${tableName})`)
  const hasColumn = result.rows.some((row) => row.name === columnName)

  if (hasColumn) {
    return
  }

  await client.execute(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${columnType}`)
}

function addDaysToDateKey(value: string, days: number) {
  const date = new Date(parseDateKey(value) + days * dayMs)
  return date.toISOString().slice(0, 10)
}

function readSqlBoolean(value: unknown) {
  return value === true || value === 1 || value === "1"
}
