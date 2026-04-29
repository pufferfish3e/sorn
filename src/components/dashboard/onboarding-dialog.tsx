"use client"

import { useEffect, useMemo, useState } from "react"
import { useUser } from "@clerk/nextjs"
import { motion, useReducedMotion } from "motion/react"
import { CheckCircle2, Send } from "lucide-react"
import type { ReminderContacts } from "@/components/dashboard/contact-panel"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

type OnboardingDialogProps = {
  dataReady: boolean
  contacts: ReminderContacts
  onContactsChange: (contacts: ReminderContacts) => void
}

type TelegramConnectionState =
  | "idle"
  | "creating"
  | "waiting"
  | "connected"
  | "expired"
  | "error"

type TelegramLinkPayload = {
  link: string
  token: string
}

type TelegramStatusPayload =
  | {
      status: "pending" | "expired"
      telegram: ""
    }
  | {
      status: "connected"
      telegram: string
    }

const premiumEase = [0.77, 0, 0.175, 1] as const

export function OnboardingDialog(props: OnboardingDialogProps) {
  return <AuthenticatedOnboardingDialog {...props} />
}

function AuthenticatedOnboardingDialog({
  dataReady,
  contacts,
  onContactsChange,
}: OnboardingDialogProps) {
  const { isLoaded, isSignedIn, user } = useUser()
  const reduceMotion = useReducedMotion()
  const [dismissed, setDismissed] = useState(true)
  const [open, setOpen] = useState(false)
  const [telegramToken, setTelegramToken] = useState("")
  const [telegramConnectionState, setTelegramConnectionState] =
    useState<TelegramConnectionState>("idle")

  const dismissedKey = useMemo(() => {
    return user?.id ? `sorn.onboarding.dismissed.v1:${user.id}` : ""
  }, [user?.id])
  const hasTelegram = contacts.telegram.trim().length > 0
  const shouldOpen =
    isLoaded && isSignedIn && dataReady && !hasTelegram && !dismissed

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      if (!dismissedKey) {
        setDismissed(true)
        return
      }

      setDismissed(window.localStorage.getItem(dismissedKey) === "true")
    }, 0)

    return () => window.clearTimeout(timeout)
  }, [dismissedKey])

  useEffect(() => {
    if (!shouldOpen) {
      return
    }

    const frame = window.requestAnimationFrame(() => {
      setOpen(true)
    })

    return () => window.cancelAnimationFrame(frame)
  }, [shouldOpen])

  useEffect(() => {
    if (!open || !telegramToken || telegramConnectionState !== "waiting") {
      return
    }

    let cancelled = false

    async function readTelegramStatus() {
      try {
        const response = await fetch("/api/onboarding/telegram-status", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: telegramToken }),
        })

        if (!response.ok) {
          throw new Error("Unable to read Telegram setup status.")
        }

        const payload: unknown = await response.json()
        const status = readTelegramStatusPayload(payload)

        if (!status || cancelled) {
          return
        }

        if (status.status === "connected") {
          onContactsChange({ ...contacts, telegram: status.telegram })
          setTelegramConnectionState("connected")
          setTelegramToken("")
          return
        }

        if (status.status === "expired") {
          setTelegramConnectionState("expired")
          setTelegramToken("")
        }
      } catch {
        if (!cancelled) {
          setTelegramConnectionState("error")
          setTelegramToken("")
        }
      }
    }

    void readTelegramStatus()
    const interval = window.setInterval(readTelegramStatus, 2_000)

    return () => {
      cancelled = true
      window.clearInterval(interval)
    }
  }, [
    contacts,
    onContactsChange,
    open,
    telegramConnectionState,
    telegramToken,
  ])

  function handleOpenChange(nextOpen: boolean) {
    if (nextOpen) {
      setOpen(true)
      return
    }

    dismissOnboarding()
  }

  function dismissOnboarding() {
    if (dismissedKey) {
      window.localStorage.setItem(dismissedKey, "true")
    }

    setDismissed(true)
    setOpen(false)
  }

  async function connectTelegram() {
    if (
      telegramConnectionState === "creating" ||
      telegramConnectionState === "waiting" ||
      hasTelegram
    ) {
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

      setTelegramToken(link.token)
      setTelegramConnectionState("waiting")
      telegramWindow.location.href = link.link
    } catch {
      telegramWindow.close()
      setTelegramConnectionState("error")
      setTelegramToken("")
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="liquid-glass max-h-[calc(100vh-2rem)] overflow-hidden rounded-[28px] bg-background/88 p-0 sm:max-w-4xl"
      >
        <div className="grid min-h-[30rem] md:grid-cols-[0.92fr_1.08fr]">
          <div className="flex flex-col justify-between gap-6 p-5 sm:p-6">
            <DialogHeader>
              <DialogTitle className="text-2xl leading-tight font-semibold">
                Set up Telegram
              </DialogTitle>
              <DialogDescription>
                One tap. Sorn handles the rest.
              </DialogDescription>
            </DialogHeader>

            <Card className="rounded-[22px] bg-card/70">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <span className="flex size-9 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Send aria-hidden="true" className="size-4" />
                  </span>
                  Telegram
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <div className="rounded-2xl border border-white/[0.06] bg-background/50 px-3 py-2">
                  <p className="text-xs text-muted-foreground">Destination</p>
                  <p
                    className={cn(
                      "mt-1 truncate text-sm",
                      hasTelegram ? "text-foreground" : "text-muted-foreground"
                    )}
                  >
                    {hasTelegram ? contacts.telegram : "Not connected"}
                  </p>
                </div>

                <Button
                  type="button"
                  className="w-full"
                  disabled={
                    hasTelegram ||
                    telegramConnectionState === "creating" ||
                    telegramConnectionState === "waiting"
                  }
                  onClick={() => void connectTelegram()}
                >
                  {hasTelegram ? (
                    <CheckCircle2 data-icon="inline-start" aria-hidden="true" />
                  ) : (
                    <Send data-icon="inline-start" aria-hidden="true" />
                  )}
                  {getTelegramConnectionLabel(
                    telegramConnectionState,
                    hasTelegram
                  )}
                </Button>

                <p
                  className={cn(
                    "min-h-5 text-sm text-muted-foreground",
                    telegramConnectionState === "connected" && "text-success",
                    (telegramConnectionState === "expired" ||
                      telegramConnectionState === "error") &&
                      "text-destructive"
                  )}
                  aria-live="polite"
                >
                  {getTelegramStatusText(telegramConnectionState, hasTelegram)}
                </p>
              </CardContent>
            </Card>

            <DialogFooter className="gap-2 sm:justify-between">
              <Button type="button" variant="ghost" onClick={dismissOnboarding}>
                Skip
              </Button>
              <Button
                type="button"
                disabled={!hasTelegram}
                onClick={dismissOnboarding}
              >
                Done
              </Button>
            </DialogFooter>
          </div>

          <div className="relative min-h-80 overflow-hidden border-t border-white/[0.06] bg-muted/20 md:border-l md:border-t-0">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_32%_18%,rgba(255,255,255,0.14),transparent_34%),radial-gradient(ellipse_at_80%_86%,rgba(232,168,56,0.16),transparent_42%),linear-gradient(145deg,rgba(28,34,46,0.86),rgba(10,14,21,0.94))]" />
            <div className="relative flex h-full items-center justify-center p-5">
              <motion.div
                className="aspect-video w-full overflow-hidden rounded-[24px] border border-white/[0.08] bg-background/72 shadow-[0_28px_90px_rgba(0,0,0,0.42)]"
                initial={reduceMotion ? false : { opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.55, ease: premiumEase }}
              >
                <video
                  className="h-full w-full object-cover"
                  controls
                  muted
                  playsInline
                  preload="metadata"
                  poster="/placeholders/onboarding-video.svg"
                >
                  <source src="/onboarding-demo.mp4" type="video/mp4" />
                </video>
              </motion.div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function getTelegramConnectionLabel(
  state: TelegramConnectionState,
  connected: boolean
) {
  if (connected || state === "connected") {
    return "Connected"
  }

  if (state === "creating") {
    return "Opening..."
  }

  if (state === "waiting") {
    return "Waiting..."
  }

  if (state === "expired" || state === "error") {
    return "Retry"
  }

  return "Connect Telegram"
}

function getTelegramStatusText(
  state: TelegramConnectionState,
  connected: boolean
) {
  if (connected || state === "connected") {
    return "Connected."
  }

  if (state === "creating") {
    return "Opening Telegram."
  }

  if (state === "waiting") {
    return "Tap Start in Telegram."
  }

  if (state === "expired") {
    return "Link expired."
  }

  if (state === "error") {
    return "Could not open Telegram."
  }

  return "Ready."
}

function readTelegramLinkPayload(value: unknown): TelegramLinkPayload | null {
  if (!isRecord(value)) {
    return null
  }

  if (typeof value.link !== "string" || typeof value.token !== "string") {
    return null
  }

  return { link: value.link, token: value.token }
}

function readTelegramStatusPayload(
  value: unknown
): TelegramStatusPayload | null {
  if (!isRecord(value) || typeof value.status !== "string") {
    return null
  }

  if (value.status === "connected" && typeof value.telegram === "string") {
    return { status: "connected", telegram: value.telegram }
  }

  if (value.status === "pending" || value.status === "expired") {
    return { status: value.status, telegram: "" }
  }

  return null
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}
