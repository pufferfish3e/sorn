"use client"

import { motion } from "motion/react"
import { CalendarIcon, Check, ExternalLink } from "lucide-react"
import { AnimatedNumber } from "@/components/dashboard/animated-number"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import {
  getHostname,
  type Trial,
  type TrialStatus,
} from "@/lib/sorn"

export type DecoratedTrial = {
  trial: Trial
  daysRemaining: number
  status: TrialStatus
  progress: number
}

type StatusStyle = {
  count: string
}

const premiumEase = [0.77, 0, 0.175, 1] as const
const legacyDefaultBannerPath = "/placeholders/default-banner.png"

const statusStyles: Record<TrialStatus, StatusStyle> = {
  urgent: {
    count: "text-destructive",
  },
  soon: {
    count: "text-primary",
  },
  safe: {
    count: "text-success",
  },
  expired: {
    count: "text-muted-foreground",
  },
}

export function TrialCard({
  decorated,
  onCancel,
}: {
  decorated: DecoratedTrial
  onCancel: (id: string) => void
}) {
  const { trial, daysRemaining, status } = decorated
  const styles = statusStyles[status]
  const countdown = getCountdownParts(daysRemaining)
  const imageUrl = getTrialImageUrl(trial)

  return (
      <motion.div className="min-w-0" transition={{ duration: 0.42, ease: premiumEase }}>
          <Card
              size="sm"
              className="group/card relative min-h-68 min-w-0 overflow-hidden rounded-[22px] border-0 bg-card/78 p-0 ring-1 ring-border/70 transition-[box-shadow,transform,--tw-ring-color] ease-(--ease-premium) hover:ring-border/45 hover:shadow-[0_22px_70px_rgba(0,0,0,0.32)] sm:aspect-video sm:min-h-80 sm:rounded-[28px] md:min-h-0"
          >
              <div
                  className="absolute inset-0 bg-muted bg-cover bg-center transition-transform duration-1500 ease-(--ease-premium) motion-safe:group-focus-within/card:scale-[1.06] motion-safe:group-hover/card:scale-[1.06]"
                  style={{ backgroundImage: `url(${imageUrl})` }}
              />
              <div className="absolute inset-0 bg-linear-to-r from-background/96 via-background/68 to-background/30" />
              <div className="absolute inset-0 bg-linear-to-t from-background/88 via-background/34 to-background/42" />
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_24%_16%,rgba(255,255,255,0.16),transparent_28%),radial-gradient(ellipse_at_78%_76%,rgba(232,168,56,0.16),transparent_34%)]" />

              <CardContent className="absolute inset-0 flex min-h-0 flex-col justify-between p-4 sm:p-6">
                  <div className="flex items-start justify-between gap-3 sm:gap-4">
                      <div className="flex min-w-0 items-center gap-3 sm:gap-4">
                          <div className="liquid-glass flex size-10 shrink-0 items-center justify-center rounded-[16px] p-2 text-foreground sm:size-14 sm:rounded-[20px]">
                              {trial.faviconUrl ? (
                                  <span
                                      aria-hidden="true"
                                      className="size-full rounded-full bg-foreground/92 bg-contain bg-center bg-no-repeat shadow-[0_0_18px_rgba(255,255,255,0.18)]"
                                      style={{
                                          backgroundImage: `url(${trial.faviconUrl})`,
                                      }}
                                  />
                              ) : (
                                  <span className="text-xl font-semibold sm:text-2xl">
                                      {trial.name.charAt(0)}
                                  </span>
                              )}
                          </div>
                          <div className="min-w-0">
                              <p className="truncate text-base font-semibold text-foreground sm:text-xl">
                                  {trial.name}
                              </p>
                              <p className="truncate text-xs text-muted-foreground sm:text-sm">
                                  {getHostname(trial.url)}
                              </p>
                          </div>
                      </div>
                      <Button
                          type="button"
                          variant="secondary"
                          size="icon-lg"
                          aria-label={`Mark ${trial.name} complete`}
                          className="liquid-glass-action group/action h-10 w-10 justify-center overflow-hidden rounded-[18px] px-3 text-foreground transition-[width,background-color,box-shadow,border-color,border-radius] duration-500 ease-(--ease-premium) hover:border-foreground/35 hover:bg-transparent hover:shadow-[0_16px_44px_rgba(0,0,0,0.26)] focus-visible:rounded-xl sm:h-12 sm:w-12 sm:justify-start sm:rounded-[24px] sm:px-4 sm:hover:w-29 sm:hover:rounded-xl sm:focus-visible:w-29"
                          onClick={() => onCancel(trial.id)}
                      >
                          <Check
                              data-icon="inline-start"
                              aria-hidden="true"
                              strokeWidth={2.4}
                              className="text-foreground drop-shadow-[0_1px_8px_rgba(255,255,255,0.2)]"
                          />
                          <span className="hidden w-full shrink-0 pr-2 opacity-0 transition-[opacity,transform] duration-500 ease-(--ease-premium) group-hover/action:translate-x-0 group-hover/action:opacity-100 group-focus-visible/action:translate-x-0 group-focus-visible/action:opacity-100 sm:inline">
                              Complete
                          </span>
                      </Button>
                  </div>

                  <div className="flex h-full translate-y-1 flex-col justify-end sm:translate-y-8">
                      <p className="translate-y-1 text-xs text-muted-foreground sm:translate-y-2 sm:text-sm">
                          Trial ends in
                      </p>
                      <div className="flex items-baseline gap-1 ">
                          <AnimatedNumber
                              value={countdown.value}
                              className={cn(
                                  "text-[2.625rem] leading-none font-medium text-foreground sm:text-5xl lg:text-6xl",
                                  styles.count
                              )}
                          />
                          <span className="text-sm leading-none font-medium text-foreground sm:text-lg lg:text-xl">
                              {countdown.unit}
                          </span>
                      </div>
                  </div>

                  <div className="flex items-end justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-2 text-muted-foreground">
                          <CalendarIcon
                              aria-hidden="true"
                              strokeWidth={2.25}
                              className="size-4 text-foreground/90 drop-shadow-[0_1px_8px_rgba(255,255,255,0.16)] sm:size-5"
                          />
                          <p className="truncate text-xs sm:text-sm">
                              {formatTrialDate(trial.trialEndDate)}
                          </p>
                      </div>
                      <Button
                          render={
                              <a
                                  href={trial.url}
                                  target="_blank"
                                  rel="noreferrer"
                                  aria-label={`Open ${trial.name}`}
                              />
                          }
                          nativeButton={false}
                          variant="ghost"
                          size="icon-lg"
                          className="liquid-glass-action group/action h-10 w-10 justify-center overflow-hidden rounded-[18px] px-3 text-foreground transition-[width,background-color,box-shadow,border-color,border-radius] duration-500 ease-(--ease-premium) hover:border-foreground/35 hover:bg-transparent hover:shadow-[0_16px_44px_rgba(0,0,0,0.26)] focus-visible:rounded-xl sm:h-12 sm:w-12 sm:justify-start sm:rounded-[24px] sm:px-4 sm:hover:w-29 sm:hover:rounded-xl sm:focus-visible:w-29"
                      >
                          <ExternalLink
                              data-icon="inline-start"
                              aria-hidden="true"
                              strokeWidth={2.4}
                              className="text-foreground drop-shadow-[0_1px_8px_rgba(255,255,255,0.2)]"
                          />
                          <span className="ml-2 hidden w-18 shrink-0 translate-x-1 opacity-0 transition-[opacity,transform] duration-500 ease-(--ease-premium) group-hover/action:translate-x-0 group-hover/action:opacity-100 group-focus-visible/action:translate-x-0 group-focus-visible/action:opacity-100 sm:inline">
                              Open Site
                          </span>
                      </Button>
                  </div>
              </CardContent>
          </Card>
      </motion.div>
  );
}

function getCountdownParts(daysRemaining: number) {
  if (daysRemaining <= 0) {
    return { value: 0, unit: "days" }
  }

  if (daysRemaining === 1) {
    return { value: 1, unit: "day" }
  }

  return {
    value: daysRemaining,
    unit: "days",
  }
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

function getTrialImageUrl(trial: Trial) {
  if (trial.imageUrl && trial.imageUrl !== legacyDefaultBannerPath) {
    return trial.imageUrl
  }

  return `https://picsum.photos/seed/${encodeURIComponent(getHostname(trial.url))}/900/320`
}
