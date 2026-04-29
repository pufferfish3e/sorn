"use client"

import { useEffect, useMemo, useState } from "react"
import { useUser } from "@clerk/nextjs"
import { AnimatePresence, motion, useReducedMotion } from "motion/react"
import {
  CheckCircle2,
  Clipboard,
  ExternalLink,
  MessageCircle,
  RefreshCw,
  Send,
  ShieldCheck,
} from "lucide-react"
import type { ReminderContacts } from "@/components/dashboard/contact-panel"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"

type OnboardingDialogProps = {
  dataReady: boolean
  contacts: ReminderContacts
  onContactsChange: (contacts: ReminderContacts) => void
  onSaveContacts: () => Promise<boolean>
  onTestTelegram: () => Promise<boolean>
  telegramTestPending: boolean
}

type TelegramLinkState =
  | "idle"
  | "creating"
  | "ready"
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
  onSaveContacts,
  onTestTelegram,
  telegramTestPending,
}: OnboardingDialogProps) {
  const { isLoaded, isSignedIn, user } = useUser()
  const reduceMotion = useReducedMotion()
  const [dismissed, setDismissed] = useState(true)
  const [open, setOpen] = useState(false)
  const [telegramLink, setTelegramLink] = useState("")
  const [telegramToken, setTelegramToken] = useState("")
  const [telegramLinkState, setTelegramLinkState] =
    useState<TelegramLinkState>("idle")
  const [statusMessage, setStatusMessage] = useState("")

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
    if (!open || telegramToken || telegramLinkState !== "idle") {
      return
    }

    let cancelled = false

    async function createTelegramLink() {
      setTelegramLinkState("creating")
      setStatusMessage("Creating Telegram setup link.")

      try {
        const response = await fetch("/api/onboarding/telegram-link", {
          method: "POST",
        })

        if (!response.ok) {
          throw new Error("Unable to create setup link.")
        }

        const payload: unknown = await response.json()
        const linkPayload = readTelegramLinkPayload(payload)

        if (!linkPayload) {
          throw new Error("Invalid setup link response.")
        }

        if (cancelled) {
          return
        }

        setTelegramLink(linkPayload.link)
        setTelegramToken(linkPayload.token)
        setTelegramLinkState("ready")
        setStatusMessage("Telegram link ready.")
      } catch {
        if (cancelled) {
          return
        }

        setTelegramLinkState("error")
        setStatusMessage("Telegram link needs bot configuration.")
      }
    }

    void createTelegramLink()

    return () => {
      cancelled = true
    }
  }, [open, telegramLinkState, telegramToken])

  useEffect(() => {
    if (!open || !telegramToken || telegramLinkState !== "waiting") {
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
          setTelegramLinkState("connected")
          setStatusMessage("Telegram connected.")
          return
        }

        if (status.status === "expired") {
          setTelegramLinkState("expired")
          setStatusMessage("Telegram setup link expired.")
        }
      } catch {
        if (!cancelled) {
          setStatusMessage("Still waiting for Telegram.")
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
    telegramLinkState,
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

  async function finishWithManualTelegram() {
    const saved = await onSaveContacts()

    if (saved) {
      dismissOnboarding()
    }
  }

  function refreshTelegramLink() {
    setTelegramLink("")
    setTelegramToken("")
    setTelegramLinkState("idle")
  }

  async function copyTelegramLink() {
    if (!telegramLink) {
      return
    }

    try {
      await navigator.clipboard.writeText(telegramLink)
      setStatusMessage("Telegram link copied.")
    } catch {
      setStatusMessage("Could not copy Telegram link.")
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="liquid-glass max-h-[calc(100vh-2rem)] overflow-y-auto rounded-[28px] bg-background/88 p-0 sm:max-w-3xl"
      >
        <div className="grid gap-0 md:grid-cols-[0.9fr_1.1fr]">
          <div className="relative overflow-hidden rounded-t-[28px] bg-muted/20 p-5 md:rounded-l-[28px] md:rounded-tr-none">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_20%_12%,rgba(255,255,255,0.18),transparent_28%),radial-gradient(ellipse_at_84%_86%,rgba(232,168,56,0.14),transparent_34%)]" />
            <div className="relative flex min-h-70 flex-col justify-between gap-8">
              <DialogHeader>
                <Badge variant="secondary" className="mb-2 w-fit">
                  First run
                </Badge>
                <DialogTitle className="text-2xl leading-tight font-semibold md:text-3xl">
                  Choose where Sorn should wake you up.
                </DialogTitle>
                <DialogDescription className="max-w-72">
                  Telegram takes one click. WhatsApp will sit beside it once the
                  channel is ready.
                </DialogDescription>
              </DialogHeader>

              <div className="flex flex-col gap-3">
                <OnboardingStep
                  active
                  complete={telegramLinkState === "connected" || hasTelegram}
                  label="Open Telegram"
                />
                <OnboardingStep
                  active={telegramLinkState === "waiting"}
                  complete={telegramLinkState === "connected" || hasTelegram}
                  label="Press Start"
                />
                <OnboardingStep
                  active={telegramLinkState === "connected" || hasTelegram}
                  complete={hasTelegram}
                  label="Save channel"
                />
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-4 p-5">
            <AnimatePresence mode="popLayout">
              {telegramLinkState === "connected" || hasTelegram ? (
                <motion.div
                  key="connected"
                  initial={reduceMotion ? false : { opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2, ease: premiumEase }}
                  className="rounded-[20px] border border-success/25 bg-success-muted/50 p-4 text-success"
                >
                  <div className="flex items-center gap-3">
                    <CheckCircle2 aria-hidden="true" className="size-5" />
                    <div className="min-w-0">
                      <p className="font-medium">Telegram connected</p>
                      <p className="truncate text-sm text-success/80">
                        {contacts.telegram}
                      </p>
                    </div>
                  </div>
                </motion.div>
              ) : null}
            </AnimatePresence>

            <Card className="rounded-[22px] bg-card/72">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span className="flex size-9 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Send aria-hidden="true" className="size-4" />
                  </span>
                  Telegram
                </CardTitle>
                <CardDescription>
                  A private bot message is the fastest reminder path.
                </CardDescription>
                <CardAction>
                  <Badge variant="default">Recommended</Badge>
                </CardAction>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-2 text-sm">
                  <span className="mt-0.5 flex size-5 items-center justify-center rounded-full bg-muted text-[11px]">
                    1
                  </span>
                  <p className="text-muted-foreground">
                    Open the bot link and tap Start in Telegram.
                  </p>
                  <span className="mt-0.5 flex size-5 items-center justify-center rounded-full bg-muted text-[11px]">
                    2
                  </span>
                  <p className="text-muted-foreground">
                    Leave this window open. Sorn will detect the bot start and
                    finish the connection.
                  </p>
                </div>

                <div className="flex flex-col gap-2 sm:flex-row">
                  {telegramLink ? (
                    <Button
                      render={
                        <a
                          href={telegramLink}
                          target="_blank"
                          rel="noreferrer"
                          onClick={() => {
                            setTelegramLinkState("waiting")
                            setStatusMessage("Waiting for Telegram Start.")
                          }}
                        />
                      }
                      nativeButton={false}
                      className="flex-1"
                    >
                      <ExternalLink data-icon="inline-start" aria-hidden="true" />
                      Open Telegram
                    </Button>
                  ) : (
                    <Button disabled className="flex-1">
                      <ExternalLink data-icon="inline-start" aria-hidden="true" />
                      {telegramLinkState === "creating"
                        ? "Preparing link"
                        : "Telegram link unavailable"}
                    </Button>
                  )}
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    aria-label="Copy Telegram link"
                    disabled={!telegramLink}
                    onClick={copyTelegramLink}
                  >
                    <Clipboard aria-hidden="true" />
                  </Button>
                  {(telegramLinkState === "expired" ||
                    telegramLinkState === "error") && (
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      aria-label="Refresh Telegram link"
                      onClick={refreshTelegramLink}
                    >
                      <RefreshCw aria-hidden="true" />
                    </Button>
                  )}
                </div>

                <p
                  className={cn(
                    "min-h-5 text-sm text-muted-foreground",
                    telegramLinkState === "expired" && "text-destructive"
                  )}
                  aria-live="polite"
                >
                  {getTelegramStatusText(telegramLinkState, statusMessage)}
                </p>
              </CardContent>
              <CardFooter className="flex-col items-stretch gap-3">
                <FieldGroup className="gap-3">
                  <Field>
                    <FieldLabel htmlFor="onboarding-telegram-target">
                      Manual fallback
                    </FieldLabel>
                    <Input
                      id="onboarding-telegram-target"
                      value={contacts.telegram}
                      onChange={(event) =>
                        onContactsChange({
                          ...contacts,
                          telegram: event.target.value,
                        })
                      }
                      placeholder="123456789"
                      autoComplete="off"
                      spellCheck={false}
                    />
                    <FieldDescription>
                      Use a numeric chat ID only when the bot link cannot be
                      used.
                    </FieldDescription>
                  </Field>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Button
                      type="button"
                      variant="secondary"
                      className="flex-1"
                      disabled={!contacts.telegram.trim()}
                      onClick={() => void finishWithManualTelegram()}
                    >
                      <ShieldCheck data-icon="inline-start" aria-hidden="true" />
                      Save Telegram
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      className="flex-1"
                      disabled={!contacts.telegram.trim() || telegramTestPending}
                      onClick={() => void onTestTelegram()}
                    >
                      <Send data-icon="inline-start" aria-hidden="true" />
                      {telegramTestPending ? "Sending" : "Test"}
                    </Button>
                  </div>
                </FieldGroup>
              </CardFooter>
            </Card>

            <Card className="rounded-[22px] border-dashed bg-card/46 opacity-80">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span className="flex size-9 items-center justify-center rounded-full bg-muted text-muted-foreground">
                    <MessageCircle aria-hidden="true" className="size-4" />
                  </span>
                  WhatsApp
                </CardTitle>
                <CardDescription>
                  Reserved for the next channel integration.
                </CardDescription>
                <CardAction>
                  <Badge variant="outline">Soon</Badge>
                </CardAction>
              </CardHeader>
            </Card>

            <Separator />

            <DialogFooter className="-mx-5 -mb-5 rounded-b-[28px]">
              <Button
                type="button"
                variant="ghost"
                onClick={dismissOnboarding}
              >
                Skip for now
              </Button>
              <Button
                type="button"
                disabled={!hasTelegram}
                onClick={dismissOnboarding}
              >
                <CheckCircle2 data-icon="inline-start" aria-hidden="true" />
                Finish setup
              </Button>
            </DialogFooter>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function OnboardingStep({
  active,
  complete,
  label,
}: {
  active?: boolean
  complete?: boolean
  label: string
}) {
  return (
    <div className="flex items-center gap-3 text-sm">
      <span
        className={cn(
          "flex size-6 items-center justify-center rounded-full border text-[11px]",
          complete
            ? "border-success/30 bg-success-muted text-success"
            : active
              ? "border-primary/40 bg-primary/10 text-primary"
              : "border-border bg-muted/30 text-muted-foreground"
        )}
      >
        {complete ? <CheckCircle2 aria-hidden="true" className="size-3" /> : ""}
      </span>
      <span
        className={cn(
          "text-muted-foreground",
          active && "text-foreground",
          complete && "text-success"
        )}
      >
        {label}
      </span>
    </div>
  )
}

function getTelegramStatusText(
  state: TelegramLinkState,
  fallbackMessage: string
) {
  if (state === "creating") {
    return "Preparing a fresh Telegram link."
  }

  if (state === "ready") {
    return "Link ready. Open Telegram to start the bot."
  }

  if (state === "waiting") {
    return "Waiting for Telegram to confirm the Start tap."
  }

  if (state === "connected") {
    return "Telegram is connected."
  }

  if (state === "expired") {
    return "This setup link expired. Refresh it and try again."
  }

  if (state === "error") {
    return fallbackMessage || "Telegram bot username is not configured."
  }

  return fallbackMessage
}

function readTelegramLinkPayload(
  value: unknown
): TelegramLinkPayload | null {
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
