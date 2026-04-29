CREATE TABLE IF NOT EXISTS trials (
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
);

CREATE INDEX IF NOT EXISTS trials_user_end_date_idx
  ON trials (user_id, trial_end_date);

CREATE TABLE IF NOT EXISTS reminder_contacts (
  user_id TEXT PRIMARY KEY,
  telegram TEXT,
  whatsapp TEXT,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS website_previews (
  domain TEXT PRIMARY KEY,
  normalized_url TEXT NOT NULL,
  service_name TEXT NOT NULL,
  favicon_url TEXT NOT NULL,
  image_url TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS telegram_connection_tokens (
  token TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  chat_id TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at TEXT NOT NULL,
  completed_at TEXT
);

CREATE INDEX IF NOT EXISTS telegram_connection_tokens_user_idx
  ON telegram_connection_tokens (user_id, created_at);
