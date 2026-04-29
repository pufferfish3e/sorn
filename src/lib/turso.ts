import "server-only"

import { createClient } from "@libsql/client"

let client: ReturnType<typeof createClient> | null = null

export function getTursoClient() {
  const url = process.env.TURSO_DATABASE_URL?.trim()

  if (!url) {
    throw new Error("TURSO_DATABASE_URL is required before database access.")
  }

  client ??= createClient({
    url,
    authToken: process.env.TURSO_AUTH_TOKEN?.trim() || undefined,
  })

  return client
}
