"use client"

import { motion } from "motion/react"
import { AnimatedNumber } from "@/components/dashboard/animated-number"

const premiumEase = [0.77, 0, 0.175, 1] as const
const revealTransition = { duration: 0.7, ease: premiumEase }

type SummaryTrial = {
  trial: {
    name: string
    trialEndDate: string
  }
}

export function SummaryPanel({
  activeCount,
  urgentCount,
  nextTrial,
  reduceMotion,
}: {
  activeCount: number
  urgentCount: number
  nextTrial?: SummaryTrial
  reduceMotion: boolean
}) {
  return (
    <motion.section
      aria-labelledby="summary-title"
      className="rounded-[14px] border border-border bg-card/70 px-3 py-3 sm:px-4"
      initial={reduceMotion ? false : { opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...revealTransition, delay: 0.06 }}
    >
      <h2 id="summary-title" className="sr-only">
        Trial summary
      </h2>
      <div className="flex flex-wrap items-start justify-between gap-3 sm:items-center">
        <div className="flex w-full items-center justify-between gap-4 sm:w-auto sm:justify-start sm:gap-5">
          <Metric value={activeCount} label="active" />
          <Metric
            value={urgentCount}
            label="urgent"
            className="text-destructive"
          />
        </div>
        <p className="w-full min-w-0 truncate text-left font-mono text-[12px] text-muted-foreground sm:w-auto sm:max-w-[60%] sm:text-right md:text-sm">
          {nextTrial
            ? `${nextTrial.trial.name} / ${nextTrial.trial.trialEndDate}`
            : "No active trials"}
        </p>
      </div>
    </motion.section>
  )
}

function Metric({
  value,
  label,
  className,
}: {
  value: number
  label: string
  className?: string
}) {
  return (
    <div className="flex items-baseline gap-2">
      <AnimatedNumber value={value} className={className} />
      <span className="text-sm text-muted-foreground">{label}</span>
    </div>
  )
}
