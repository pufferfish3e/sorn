import "server-only"

import {
  listDueTelegramReminders,
  markTrialReminderSent,
  type DueTelegramReminder,
} from "@/lib/trial-store"
import { sendTelegramMessage } from "@/lib/telegram"

export type TelegramReminderDispatchResult = {
  checked: number
  sent: number
  failed: number
}

export async function dispatchDueTelegramReminders(todayKey?: string) {
  const reminders = await listDueTelegramReminders(todayKey)
  const result: TelegramReminderDispatchResult = {
    checked: reminders.length,
    sent: 0,
    failed: 0,
  }

  for (const reminder of reminders) {
    try {
      await sendTelegramMessage({
        chatId: reminder.telegramChatId,
        text: buildTelegramReminderText(reminder),
      })
      await markTrialReminderSent(reminder.userId, reminder.id)
      result.sent += 1
    } catch (error) {
      console.error("Unable to send Telegram reminder.", {
        error,
        trialId: reminder.id,
        userId: reminder.userId,
      })
      result.failed += 1
    }
  }

  return result
}

function buildTelegramReminderText(reminder: DueTelegramReminder) {
  return [
    "Sorn trial reminder",
    `${reminder.name} ends tomorrow (${formatTrialDate(
      reminder.trialEndDate
    )}).`,
    reminder.url,
  ].join("\n")
}

function formatTrialDate(value: string) {
  const [year, month, day] = value.split("-").map(Number)

  if (!year || !month || !day) {
    return value
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, day)))
}
