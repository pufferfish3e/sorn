"use client"

import { useState } from "react"
import NumberFlow, { continuous } from "@number-flow/react"
import { motion } from "motion/react"
import { cn } from "@/lib/utils"

const premiumEase = [0.77, 0, 0.175, 1] as const

type AnimatedNumberProps = {
  value: number
  className?: string
  trigger?: "viewport" | "mount"
}

export function AnimatedNumber({
  value,
  className,
  trigger = "viewport",
}: AnimatedNumberProps) {
  const [hasEntered, setHasEntered] = useState(trigger === "mount")
  const visibleValue = hasEntered ? value : 0

  const viewportProps =
    trigger === "viewport"
      ? {
          viewport: { once: true, amount: 0.8 },
          onViewportEnter: () => setHasEntered(true),
        }
      : {}

  return (
    <motion.span
      {...viewportProps}
      className={cn(
        "inline-block text-right font-mono text-2xl leading-none font-medium tabular-nums",
        className
      )}
      style={{ minWidth: `${getReservedWidth(value)}ch` }}
      transition={{ duration: 0.7, ease: premiumEase }}
    >
      <NumberFlow
        value={visibleValue}
        plugins={[continuous]}
        trend={1}
        locales="en-US"
      />
    </motion.span>
  )
}

function getReservedWidth(value: number) {
  const normalized = Number.isFinite(value) ? Math.trunc(Math.abs(value)) : 0
  return Math.max(1, normalized.toLocaleString("en-US").length)
}
