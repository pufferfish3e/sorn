"use client"

import { useEffect, useState } from "react"
import type { ComponentProps, FormEvent, ReactNode } from "react"
import { Check, MessageCircle, Send } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Popover,
  PopoverContent,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"

export type ReminderContacts = {
  telegram: string
  whatsapp: string
}

type TelegramConnectionState =
  | "idle"
  | "creating"
  | "waiting"
  | "connected"
  | "error"

export function ContactPopover({
  contacts,
  onChange,
  onSubmit,
}: {
  contacts: ReminderContacts
  onChange: (contacts: ReminderContacts) => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
}) {
  const hasTelegram = contacts.telegram.trim().length > 0
  const hasWhatsapp = contacts.whatsapp.trim().length > 0
  const [telegramConnectionState, setTelegramConnectionState] =
    useState<TelegramConnectionState>("idle")
  const [telegramConnectionToken, setTelegramConnectionToken] = useState("")

  useEffect(() => {
    if (!telegramConnectionToken || telegramConnectionState !== "waiting") {
      return
    }

    let cancelled = false

    async function readTelegramStatus() {
      try {
        const response = await fetch("/api/onboarding/telegram-status", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: telegramConnectionToken }),
        })

        if (!response.ok) {
          throw new Error("Unable to read Telegram status.")
        }

        const payload: unknown = await response.json()
        const status = readTelegramStatusPayload(payload)

        if (cancelled || !status) {
          return
        }

        if (status.status === "connected") {
          onChange({ ...contacts, telegram: status.telegram })
          setTelegramConnectionState("connected")
          setTelegramConnectionToken("")
        }

        if (status.status === "expired") {
          setTelegramConnectionState("error")
          setTelegramConnectionToken("")
        }
      } catch {
        if (!cancelled) {
          setTelegramConnectionState("error")
          setTelegramConnectionToken("")
        }
      }
    }

    void readTelegramStatus()
    const interval = window.setInterval(readTelegramStatus, 2_000)

    return () => {
      cancelled = true
      window.clearInterval(interval)
    }
  }, [contacts, onChange, telegramConnectionState, telegramConnectionToken])

  async function connectTelegram() {
    if (telegramConnectionState === "creating") {
      return
    }

    setTelegramConnectionState("creating")
    const telegramWindow = window.open("about:blank", "_blank")

    if (!telegramWindow) {
      setTelegramConnectionState("error")
      return
    }

    telegramWindow.opener = null

    try {
      const response = await fetch("/api/onboarding/telegram-link", {
        method: "POST",
      })

      if (!response.ok) {
        throw new Error("Unable to create Telegram link.")
      }

      const payload: unknown = await response.json()
      const link = readTelegramLinkPayload(payload)

      if (!link) {
        throw new Error("Invalid Telegram link response.")
      }

      setTelegramConnectionToken(link.token)
      setTelegramConnectionState("waiting")
      telegramWindow.location.href = link.link
    } catch {
      telegramWindow.close()
      setTelegramConnectionState("error")
      setTelegramConnectionToken("")
    }
  }

  return (
    <div className="flex items-center gap-1">
      <Popover>
        <ChannelTrigger label="Telegram reminders">
          <TelegramIcon
            linked={hasTelegram}
            className="size-5"
            aria-hidden="true"
          />
        </ChannelTrigger>
        <PopoverContent
          align="start"
          sideOffset={8}
          className="liquid-glass w-80 rounded-[18px] bg-transparent p-3"
        >
          <PopoverHeader>
            <PopoverTitle id="telegram-channel-title">Telegram</PopoverTitle>
          </PopoverHeader>
          <div className="flex flex-col gap-3">
            {hasTelegram && (
              <p className="truncate font-mono text-xs text-muted-foreground">
                {contacts.telegram}
              </p>
            )}
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="w-full"
              onClick={() => void connectTelegram()}
            >
              {hasTelegram ? (
                <Check data-icon="inline-start" aria-hidden="true" />
              ) : (
                <Send data-icon="inline-start" aria-hidden="true" />
              )}
              {getTelegramConnectionLabel(
                telegramConnectionState,
                hasTelegram
              )}
            </Button>
          </div>
        </PopoverContent>
      </Popover>

      <Popover>
        <ChannelTrigger label="WhatsApp reminders">
          <WhatsAppIcon
            linked={hasWhatsapp}
            className="size-5"
            aria-hidden="true"
          />
        </ChannelTrigger>
        <PopoverContent
          align="start"
          sideOffset={8}
          className="liquid-glass w-80 rounded-[18px] bg-transparent p-3"
        >
          <PopoverHeader>
            <PopoverTitle id="whatsapp-channel-title">WhatsApp</PopoverTitle>
          </PopoverHeader>
          <form onSubmit={onSubmit}>
            <FieldGroup className="gap-3">
              <Field>
                <FieldLabel htmlFor="whatsapp-number">
                  <MessageCircle aria-hidden="true" />
                  Number
                </FieldLabel>
                <Input
                  id="whatsapp-number"
                  name="whatsapp"
                  type="tel"
                  inputMode="tel"
                  value={contacts.whatsapp}
                  onChange={(event) =>
                    onChange({ ...contacts, whatsapp: event.target.value })
                  }
                  placeholder="+65 whatsapp"
                  autoComplete="tel"
                />
              </Field>

              <Button
                type="submit"
                variant="secondary"
                size="sm"
                className="w-full"
              >
                <Check data-icon="inline-start" aria-hidden="true" />
                Save
              </Button>
            </FieldGroup>
          </form>
        </PopoverContent>
      </Popover>
    </div>
  )
}

function ChannelTrigger({
  children,
  label,
}: {
  children: ReactNode
  label: string
}) {
  return (
    <PopoverTrigger
      render={
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label={label}
          className="bg-transparent text-muted-foreground hover:bg-transparent hover:text-foreground aria-expanded:bg-transparent"
        />
      }
    >
      {children}
    </PopoverTrigger>
  )
}

function getTelegramConnectionLabel(
  state: TelegramConnectionState,
  connected: boolean
) {
  if (state === "creating") {
    return "Opening..."
  }

  if (state === "waiting") {
    return "Waiting..."
  }

  if (state === "connected" || connected) {
    return "Connected"
  }

  return "Connect"
}

function readTelegramLinkPayload(value: unknown) {
  if (!isRecord(value)) {
    return null
  }

  if (typeof value.link !== "string" || typeof value.token !== "string") {
    return null
  }

  return { link: value.link, token: value.token }
}

function readTelegramStatusPayload(value: unknown) {
  if (!isRecord(value) || typeof value.status !== "string") {
    return null
  }

  if (value.status === "connected" && typeof value.telegram === "string") {
    return { status: "connected" as const, telegram: value.telegram }
  }

  if (value.status === "pending" || value.status === "expired") {
    return { status: value.status, telegram: "" }
  }

  return null
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

function TelegramIcon({
  linked,
  className,
  ...props
}: ComponentProps<"svg"> & { linked: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={cn(
        "transition-colors",
        linked ? "text-[#2AABEE]" : "text-muted-foreground",
        className
      )}
      {...props}
    >
      <path d="M21.54 3.5a1.47 1.47 0 0 0-1.5-.25L2.9 9.86c-.67.26-1.09.7-1.04 1.17.05.47.55.84 1.28 1.04l4.28 1.18 1.64 5.14c.2.64.55.97 1 .99.45.02.78-.22 1.12-.56l2.31-2.24 4.17 3.06c.76.56 1.36.27 1.57-.71l3.02-14.25c.16-.76-.1-1.05-.71-1.18Zm-4.5 4.16-7.2 6.5-.28 2.9-1.02-3.38 8.5-6.02Z" />
    </svg>
  )
}

function WhatsAppIcon({
  linked,
  className,
  ...props
}: ComponentProps<"svg"> & { linked: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={cn(
        "transition-colors",
        linked ? "text-[#25D366]" : "text-muted-foreground",
        className
      )}
      {...props}
    >
      <path d="M12.03 2.25a9.68 9.68 0 0 0-8.35 14.56L2.25 21.75l5.1-1.34a9.69 9.69 0 1 0 4.68-18.16Zm0 1.76a7.92 7.92 0 0 1 6.74 12.1 7.92 7.92 0 0 1-10.98 2.55l-.35-.2-3.02.8.82-2.93-.23-.37a7.92 7.92 0 0 1 7.02-11.95Zm-3.22 3.9c-.18 0-.46.07-.7.34-.24.27-.92.9-.92 2.18s.94 2.53 1.07 2.7c.13.18 1.81 2.9 4.5 3.95 2.24.88 2.7.7 3.19.66.49-.04 1.58-.64 1.8-1.27.22-.62.22-1.16.15-1.27-.07-.11-.24-.18-.52-.32-.27-.13-1.58-.78-1.83-.87-.24-.09-.42-.13-.6.13-.18.27-.69.87-.84 1.05-.16.18-.31.2-.58.07-.27-.13-1.13-.42-2.15-1.33-.8-.71-1.33-1.58-1.49-1.85-.15-.27-.02-.42.12-.55.12-.12.27-.31.4-.47.13-.16.18-.27.27-.45.09-.18.04-.34-.02-.47-.07-.13-.6-1.45-.82-1.98-.22-.52-.44-.45-.6-.45h-.51Z" />
    </svg>
  )
}
