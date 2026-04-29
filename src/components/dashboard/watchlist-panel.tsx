"use client"

import { AnimatePresence, motion } from "motion/react"
import { Bell, Plus } from "lucide-react"
import { AnimatedNumber } from "@/components/dashboard/animated-number"
import {
  TrialCard,
  type DecoratedTrial,
} from "@/components/dashboard/trial-card"
import { Button } from "@/components/ui/button"
import { DialogTrigger } from "@/components/ui/dialog"
import {
  Empty,
  EmptyContent,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"

const premiumEase = [0.77, 0, 0.175, 1] as const

export function WatchlistPanel({
  visibleTrials,
  reduceMotion,
  onCancel,
}: {
  visibleTrials: DecoratedTrial[]
  reduceMotion: boolean
  onCancel: (id: string) => void
}) {
  return (
    <section aria-labelledby="watchlist-title" className="min-w-0">
      <div className="mb-2 flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <h2
            id="watchlist-title"
            className="text-sm font-medium text-muted-foreground md:text-base"
          >
            Watchlist
          </h2>
        </div>
        <motion.div
          layout
          className="font-mono text-[11px] text-muted-foreground md:text-[12px]"
          transition={{ type: "spring", duration: 0.9, bounce: 0 }}
        >
          <AnimatedNumber
            value={visibleTrials.length}
            className="text-[11px] md:text-[12px]"
            trigger="mount"
          />
        </motion.div>
      </div>

      {visibleTrials.length > 0 ? (
        <div className="grid min-w-0 grid-cols-1 gap-3 sm:gap-4 lg:grid-cols-[repeat(2,minmax(0,1fr))]">
          <AnimatePresence initial={false}>
            {visibleTrials.map((decorated, index) => (
              <motion.div
                key={decorated.trial.id}
                className="min-w-0"
                layout={!reduceMotion}
                initial={
                  reduceMotion ? false : { opacity: 0, y: 20, scale: 0.98 }
                }
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={
                  reduceMotion
                    ? { opacity: 0 }
                    : { opacity: 0, height: 0, scale: 0.98 }
                }
                transition={{
                  duration: reduceMotion ? 0 : 0.64,
                  ease: premiumEase,
                  delay: Math.min(index * 0.05, 0.2),
                }}
              >
                <TrialCard
                  decorated={decorated}
                  onCancel={onCancel}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      ) : (
        <Empty className="min-h-65 rounded-[14px] border border-dashed border-border bg-transparent p-6 sm:p-8">
          <EmptyHeader>
            <EmptyMedia
              variant="icon"
              className="size-11 rounded-[14px] bg-warning-muted text-primary [&_svg]:size-5"
            >
              <Bell aria-hidden="true" />
            </EmptyMedia>
            <EmptyTitle className="text-lg font-medium md:text-xl">
              Nothing to watch
            </EmptyTitle>
          </EmptyHeader>
          <EmptyContent className="flex flex-col items-center gap-3">
            <div className="flex items-center gap-2 rounded-lg px-3 py-2 font-mono text-[12px] text-muted-foreground md:text-sm">
              <kbd className="rounded-sm bg-muted px-1.5 py-0.5 text-foreground">
                A
              </kbd>
              Add Free Trial
            </div>
            <DialogTrigger render={<Button type="button" />}>
              <Plus data-icon="inline-start" aria-hidden="true" />
              Add trial
            </DialogTrigger>
          </EmptyContent>
        </Empty>
      )}
    </section>
  )
}
