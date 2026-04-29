"use client"

import { useRef, useState, type PointerEvent } from "react"
import Link from "next/link"
import NumberFlow, { continuous } from "@number-flow/react"
import {
  motion,
  MotionConfig,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
} from "motion/react"
import {
  ArrowRight,
  CalendarIcon,
} from "lucide-react"
import { AuthControls } from "@/components/auth-controls"
import { buttonVariants } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"

type HomeLandingProps = {
  authEnabled: boolean
}

type PointerMotion = {
  clientX: ReturnType<typeof useSpring>
  clientY: ReturnType<typeof useSpring>
}

const premiumEase = [0.77, 0, 0.175, 1] as const
const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max)

const previewTrials = [
  {
    name: "Figma",
    domain: "figma.com",
    days: 30,
    date: "May 29",
    tone: "text-success",
    imageUrl:
      "https://cdn.sanity.io/images/599r6htc/regionalized/342e17642c7afa81206490b0dd21c3e5724ae040-2400x1260.png?w=1200&q=70&fit=max&auto=format",
    faviconUrl: "https://static.figma.com/app/icon/2/icon-128.png",
    position: "left-[5%] bottom-[10%] 2xl:left-[10%]",
    size: "h-[13.5rem] w-[24.5rem] 2xl:h-[15.5rem] 2xl:w-[29rem]",
    z: "z-30",
    rotate: -10,
    tilt: 6,
    orbitX: 5,
    orbitY: 3,
    orbitDuration: 18,
    shadow:
      "shadow-[0_34px_130px_rgba(0,0,0,0.56),0_0_58px_rgba(255,255,255,0.08),0_0_88px_rgba(120,145,180,0.12)]",
  },
  {
    name: "Notion",
    domain: "notion.so",
    days: 14,
    date: "May 13",
    tone: "text-primary",
    imageUrl: "https://www.notion.com/front-static/meta/custom-agents-og.png",
    faviconUrl: "https://www.notion.so/front-static/favicon.ico",
    position: "right-[4%] top-[36%] 2xl:right-[10%]",
    size: "h-52 w-84",
    z: "z-20",
    rotate: 6,
    tilt: 4,
    orbitX: -8,
    orbitY: 9,
    orbitDuration: 21,
    shadow:
      "shadow-[0_26px_96px_rgba(0,0,0,0.48),0_0_76px_rgba(232,168,56,0.13)]",
  },
  {
    name: "Linear",
    domain: "linear.app",
    days: 1,
    date: "Apr 30",
    tone: "text-destructive",
    imageUrl: "https://linear.app/static/og/homepage.jpg",
    faviconUrl: "https://linear.app/favicon.ico",
    position: "left-[11%] top-[17%] 2xl:left-[17%]",
    size: "h-44 w-72",
    z: "z-10",
    rotate: -2,
    tilt: 2.5,
    orbitX: 5,
    orbitY: -6,
    orbitDuration: 24,
    shadow:
      "shadow-[0_18px_70px_rgba(0,0,0,0.42),0_0_66px_rgba(224,82,82,0.2)]",
  },
]

const sequenceSteps = ["Paste URL", "pick expiry", "done"]

const headlineGoldClass =
  "bg-[linear-gradient(100deg,#fff6c6_0%,#f0c15a_32%,#bc7b22_58%,#ffe7a3_78%,#d69a2d_100%)] bg-[length:210%_100%] bg-clip-text text-transparent drop-shadow-[0_0_22px_rgba(232,168,56,0.22)]"

const supportGoldClass =
  "bg-[linear-gradient(100deg,rgba(255,246,198,0.78)_0%,rgba(240,193,90,0.76)_36%,rgba(188,123,34,0.7)_68%,rgba(255,231,163,0.74)_100%)] bg-clip-text text-transparent drop-shadow-[0_0_18px_rgba(232,168,56,0.12)]"

const goldButtonClass =
  "border-primary/55 bg-[linear-gradient(135deg,#fff3b0_0%,#f0bd52_27%,#c47d1d_62%,#ffe09a_100%)] text-primary-foreground shadow-[0_0_58px_rgba(232,168,56,0.34),0_22px_80px_rgba(0,0,0,0.34),inset_0_1px_0_rgba(255,255,255,0.42),inset_0_-10px_22px_rgba(75,42,0,0.16)] hover:border-primary/70 hover:brightness-110"

const glassNavClass =
  "rounded-[22px] border border-white/[0.035] bg-card/58 shadow-[0_18px_70px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.045)] backdrop-blur-2xl"

const containerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.08,
    },
  },
}

const riseVariants = {
  hidden: { opacity: 0, y: 14, filter: "blur(10px)" },
  visible: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 0.78, ease: premiumEase },
  },
}

type CardVariantCustom = {
  index: number
  rotate: number
}

const cardVariants = {
  hidden: ({ rotate }: CardVariantCustom) => ({
    opacity: 0,
    y: 26,
    scale: 0.88,
    rotate: rotate > 0 ? rotate + 8 : rotate - 8,
    filter: "blur(18px)",
  }),
  visible: ({ index }: CardVariantCustom) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    rotate: 0,
    filter: "blur(0px)",
    transition: {
      duration: 0.92,
      ease: premiumEase,
      delay: 0.24 + index * 0.1,
    },
  }),
}

export function HomeLanding({ authEnabled }: HomeLandingProps) {
  const reduceMotion = useReducedMotion()
  const motionInitial = reduceMotion ? false : "hidden"
  const [pointerActive, setPointerActive] = useState(false)
  const pointerX = useMotionValue(0)
  const pointerY = useMotionValue(0)
  const pointer = {
    clientX: useSpring(pointerX, { stiffness: 90, damping: 26, mass: 0.45 }),
    clientY: useSpring(pointerY, { stiffness: 90, damping: 26, mass: 0.45 }),
  }

  function handleHeroPointerMove(event: PointerEvent<HTMLElement>) {
    if (reduceMotion) {
      return
    }

    if (!pointerActive) {
      setPointerActive(true)
    }

    pointerX.set(event.clientX)
    pointerY.set(event.clientY)
  }

  function handleHeroPointerLeave() {
    setPointerActive(false)
    pointerX.set(0)
    pointerY.set(0)
  }

  return (
    <MotionConfig reducedMotion="user">
      <main
        id="main"
        className="min-h-screen overflow-hidden bg-[radial-gradient(ellipse_at_18%_24%,rgba(232,168,56,0.12),transparent_34%),radial-gradient(ellipse_at_82%_34%,rgba(82,118,190,0.12),transparent_36%),radial-gradient(ellipse_at_50%_100%,rgba(76,175,125,0.08),transparent_42%),linear-gradient(180deg,#151b25_0%,#101720_52%,#121821_100%)] text-foreground"
      >
        <section
          className="relative min-h-[94svh] overflow-hidden px-4 py-5 sm:px-6 lg:px-8"
          onPointerMove={handleHeroPointerMove}
          onPointerLeave={handleHeroPointerLeave}
        >
          <motion.div
            aria-hidden="true"
            className="absolute inset-0 bg-[radial-gradient(ellipse_at_18%_76%,rgba(232,168,56,0.12),transparent_42%),radial-gradient(ellipse_at_82%_28%,rgba(82,118,190,0.11),transparent_38%),linear-gradient(to_bottom,rgba(255,255,255,0.055),transparent_24%,rgba(255,255,255,0.032)_72%,transparent),radial-gradient(ellipse_at_50%_46%,rgba(255,255,255,0.08),transparent_42%)]"
            initial={reduceMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1.1, ease: premiumEase }}
          />
          <motion.div
            aria-hidden="true"
            className="absolute inset-x-4 bottom-6 top-20 z-0 overflow-hidden rounded-[32px] border border-white/[0.045] bg-[radial-gradient(ellipse_at_16%_80%,rgba(232,168,56,0.13),transparent_44%),radial-gradient(ellipse_at_86%_34%,rgba(77,111,184,0.14),transparent_42%),radial-gradient(ellipse_at_50%_8%,rgba(255,255,255,0.065),transparent_38%),linear-gradient(145deg,rgba(34,41,52,0.92),rgba(17,23,32,0.84)_52%,rgba(19,25,34,0.96))] shadow-[inset_0_1px_0_rgba(255,255,255,0.055),inset_0_-1px_0_rgba(255,255,255,0.024),0_34px_140px_rgba(0,0,0,0.42)] backdrop-blur-2xl sm:inset-x-8"
            initial={reduceMotion ? false : { opacity: 0, scale: 0.985 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.9, ease: premiumEase }}
          >
            <div className="absolute inset-x-[13%] top-[19%] h-[34rem] bg-[radial-gradient(ellipse_at_center,rgba(232,168,56,0.18),transparent_60%)]" />
            <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(255,255,255,0.035),transparent_28%,rgba(0,0,0,0.18)_100%)]" />
            <div
              aria-hidden="true"
              className="absolute inset-0 opacity-[0.03] mix-blend-screen"
              style={{
                backgroundImage:
                  "radial-gradient(circle at center, rgba(255,255,255,0.9) 0 1px, transparent 1px), radial-gradient(circle at center, rgba(255,255,255,0.55) 0 1px, transparent 1px)",
                backgroundPosition: "0 0, 11px 13px",
                backgroundSize: "19px 19px, 27px 27px",
              }}
            />

            {previewTrials.map((trial, index) => (
              <FloatingTrialCard
                key={trial.name}
                trial={trial}
                index={index}
                pointer={pointer}
                pointerActive={pointerActive}
                reduceMotion={Boolean(reduceMotion)}
              />
            ))}
          </motion.div>

          <motion.header
            className="relative z-30 mx-auto flex max-w-7xl items-center justify-between gap-3"
            initial={reduceMotion ? false : { opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.62, ease: premiumEase }}
          >
            <motion.nav
              className={cn("flex min-w-0 items-center gap-1 p-1", glassNavClass)}
              whileHover={
                reduceMotion
                  ? undefined
                  : { borderColor: "rgba(255,255,255,0.14)" }
              }
            >
              <Link
                href="/"
                className="px-3 py-1.5 font-display text-xl tracking-normal"
              >
                Sorn
              </Link>
              <span className="hidden h-4 w-px bg-white/10 sm:block" />
              <Link
                href="/dashboard"
                className="hidden rounded-2xl px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground sm:block"
              >
                Dashboard
              </Link>
            </motion.nav>

            <div className={cn("flex items-center gap-2 p-1", glassNavClass)}>
              <motion.div
                whileHover={reduceMotion ? undefined : { y: -1 }}
                whileTap={reduceMotion ? undefined : { scale: 0.985 }}
              >
                <Link
                  href="/dashboard"
                  className={cn(
                    buttonVariants({ variant: "default", size: "sm" }),
                    "hidden sm:inline-flex"
                  )}
                >
                  Start
                  <ArrowRight data-icon="inline-end" aria-hidden="true" />
                </Link>
              </motion.div>
              <AuthControls enabled={authEnabled} />
            </div>
          </motion.header>

          <motion.div
            className="relative z-20 mx-auto flex min-h-[calc(94svh-5.5rem)] max-w-4xl flex-col items-center justify-center py-12 text-center"
            variants={containerVariants}
            initial={motionInitial}
            animate="visible"
          >
            <motion.h1
              className="max-w-4xl text-balance font-display text-4xl leading-[1.04] tracking-normal text-foreground drop-shadow-[0_16px_60px_rgba(0,0,0,0.46)] sm:text-6xl md:text-7xl"
              variants={containerVariants}
            >
              <motion.span variants={riseVariants} className="block font-normal">
                Never forget a
              </motion.span>
              <motion.span variants={riseVariants} className="mt-2 block">
                trial{" "}
                <motion.span
                  className={cn(
                    "inline-block pb-1 italic leading-[1.08]",
                    headlineGoldClass
                  )}
                  style={{
                    fontFamily:
                      "var(--font-playfair-display), Georgia, serif",
                  }}
                  animate={
                    reduceMotion
                      ? undefined
                      : { backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"] }
                  }
                  transition={
                    reduceMotion
                      ? undefined
                      : { duration: 8, ease: "easeInOut", repeat: Infinity }
                  }
                >
                  again.
                </motion.span>
              </motion.span>
            </motion.h1>

            <motion.div
              variants={riseVariants}
              className="mt-10 flex items-center gap-2 rounded-full border border-white/[0.035] bg-card/48 px-3 py-1.5 text-[11px] text-muted-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.035)] backdrop-blur-2xl sm:text-xs"
            >
              <span className="size-1.5 rounded-full bg-success shadow-[0_0_18px_rgba(76,175,125,0.7)]" />
              Works with 1,000+ websites
            </motion.div>

            <motion.div
              variants={riseVariants}
              className="mt-8 flex flex-col items-center gap-4"
            >
              <HeroCta reduceMotion={Boolean(reduceMotion)} />
            </motion.div>

            <motion.div
              variants={riseVariants}
              aria-label="Paste URL, pick expiry, done"
              className="mt-7 flex flex-wrap items-center justify-center gap-2 text-xs font-medium text-foreground/70 sm:text-sm"
            >
              {sequenceSteps.map((step, index) => (
                <motion.span
                  key={step}
                  className="inline-flex items-center gap-2"
                  animate={
                    reduceMotion
                      ? undefined
                      : { opacity: [0.45, 1, 0.45] }
                  }
                  transition={
                    reduceMotion
                      ? undefined
                      : {
                          duration: 3.9,
                          ease: "easeInOut",
                          repeat: Infinity,
                          delay: index * 1.3,
                        }
                  }
                >
                  <span>{step}</span>
                  {index < sequenceSteps.length - 1 ? (
                    <span className={cn("opacity-85", supportGoldClass)} aria-hidden="true">
                      -&gt;
                    </span>
                  ) : null}
                </motion.span>
              ))}
            </motion.div>
          </motion.div>
        </section>
      </main>
    </MotionConfig>
  )
}

function HeroCta({
  reduceMotion,
}: {
  reduceMotion: boolean
}) {
  return (
    <motion.div className="relative">
      <motion.div
        aria-hidden="true"
        className="pointer-events-none absolute -inset-10 rounded-full bg-primary/30 blur-3xl"
        animate={
          reduceMotion
            ? { opacity: 0.5 }
            : { opacity: [0.5, 0.9, 0.5], scale: [1, 1.04, 1] }
        }
        transition={
          reduceMotion
            ? undefined
            : { duration: 3, ease: "easeInOut", repeat: Infinity }
        }
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-2 top-1/2 h-8 -translate-y-1/2 rounded-full bg-white/28 blur-xl"
      />
      <Link
        href="/dashboard"
          className={cn(
            buttonVariants({ variant: "default", size: "xl" }),
            goldButtonClass,
          "relative z-10 flex px-6 py-4"
          )}
        >
        <span className="leading-none">Start for free</span>
        <ArrowRight
          data-icon="inline-end"
          aria-hidden="true"
          className="ml-2"
        />
      </Link>
    </motion.div>
  )
}

function FloatingTrialCard({
  trial,
  index,
  pointer,
  pointerActive,
  reduceMotion,
}: {
  trial: (typeof previewTrials)[number]
  index: number
  pointer: PointerMotion
  pointerActive: boolean
  reduceMotion: boolean
}) {
  const cardRef = useRef<HTMLDivElement>(null)
  const rotateX = useTransform(pointer.clientY, (value) => {
    const rect = cardRef.current?.getBoundingClientRect()

    if (reduceMotion || !pointerActive || !rect || value === 0) {
      return 0
    }

    const centerY = rect.top + rect.height / 2
    const distance = (value - centerY) / rect.height

    return clamp(-distance * trial.tilt, -trial.tilt, trial.tilt)
  })
  const rotateY = useTransform(pointer.clientX, (value) => {
    const rect = cardRef.current?.getBoundingClientRect()

    if (reduceMotion || !pointerActive || !rect || value === 0) {
      return 0
    }

    const centerX = rect.left + rect.width / 2
    const distance = (value - centerX) / rect.width

    return clamp(distance * trial.tilt, -trial.tilt, trial.tilt)
  })
  const rotateZ = useTransform(pointer.clientX, (value) => {
    const rect = cardRef.current?.getBoundingClientRect()

    if (reduceMotion || !pointerActive || !rect || value === 0) {
      return trial.rotate
    }

    const centerX = rect.left + rect.width / 2
    const distance = (value - centerX) / rect.width

    return trial.rotate + clamp(distance * (trial.tilt * 0.22), -1.8, 1.8)
  })

  return (
    <motion.div
      className={cn(
        "absolute hidden lg:block",
        trial.position,
        trial.size,
        trial.z
      )}
      custom={{ index, rotate: trial.rotate }}
      variants={cardVariants}
      initial={reduceMotion ? false : "hidden"}
      animate="visible"
    >
      <motion.div
        className="h-full w-full"
        animate={
          reduceMotion
            ? undefined
            : {
                x: [0, trial.orbitX, 0, -trial.orbitX * 0.55, 0],
                y: [0, -trial.orbitY, 0, trial.orbitY * 0.55, 0],
              }
        }
        transition={
          reduceMotion
            ? undefined
            : {
                duration: trial.orbitDuration,
                ease: "easeInOut",
                repeat: Infinity,
              }
        }
      >
        <motion.div
          className="h-full w-full"
          ref={cardRef}
          style={{
            rotateX,
            rotateY,
            rotate: rotateZ,
            transformPerspective: 900,
          }}
          whileHover={
            reduceMotion
              ? undefined
              : {
                  y: -10,
                  scale: 1.025,
                  transition: { duration: 0.34, ease: premiumEase },
                }
          }
        >
          <Card
            size="sm"
            className={cn(
              "group/card relative h-full overflow-hidden rounded-[24px] border-0 bg-card/78 p-0 ring-1 ring-white/[0.09] transition-[box-shadow,--tw-ring-color,filter] ease-(--ease-premium) hover:ring-white/[0.18]",
              trial.shadow
            )}
          >
            <div
              className="absolute inset-0 bg-muted bg-cover bg-center transition-transform duration-1500 ease-(--ease-premium) motion-safe:group-hover/card:scale-[1.06]"
              style={{ backgroundImage: `url(${trial.imageUrl})` }}
            />
            <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(16,23,32,0.82),rgba(18,25,35,0.52),rgba(20,28,38,0.2))]" />
            <div className="absolute inset-0 bg-[linear-gradient(to_top,rgba(16,23,32,0.8),rgba(18,25,35,0.24),rgba(20,28,38,0.22))]" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_24%_16%,rgba(255,255,255,0.14),transparent_30%)]" />

            <CardContent className="absolute inset-0 flex flex-col justify-between p-4">
              <div className="flex min-w-0 items-center gap-3">
                <div className="liquid-glass flex size-11 shrink-0 items-center justify-center rounded-[17px] p-2 text-foreground">
                  <span
                    aria-hidden="true"
                    className="size-full rounded-full bg-foreground/92 bg-contain bg-center bg-no-repeat shadow-[0_0_18px_rgba(255,255,255,0.18)]"
                    style={{ backgroundImage: `url(${trial.faviconUrl})` }}
                  />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-base font-semibold text-foreground">
                    {trial.name}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {trial.domain}
                  </p>
                </div>
              </div>

              <div>
                <p className="translate-y-1 text-xs text-muted-foreground">
                  Trial ends in
                </p>
                <div className="flex items-baseline gap-1">
                  <span
                    className={cn("text-5xl leading-none tabular-nums", trial.tone)}
                  >
                    <HomeNumber
                      value={trial.days}
                      duration={1700 + index * 100}
                    />
                  </span>
                  <span className="text-base leading-none font-medium text-foreground">
                    {trial.days === 1 ? "day" : "days"}
                  </span>
                </div>
              </div>

              <div className="flex min-w-0 items-center gap-2 text-muted-foreground">
                <CalendarIcon
                  aria-hidden="true"
                  strokeWidth={2.25}
                  className="size-4 text-foreground/90 drop-shadow-[0_1px_8px_rgba(255,255,255,0.16)]"
                />
                <p className="truncate text-xs">{trial.date}</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </motion.div>
  )
}

function HomeNumber({
  value,
  duration = 1800,
}: {
  value: number
  duration?: number
}) {
  const [visible, setVisible] = useState(false)
  const renderedValue = visible ? value : 0

  return (
    <motion.span
      className="inline-block text-right tabular-nums"
      style={{ minWidth: `${String(value).length}ch` }}
      viewport={{ once: true, amount: 0.9 }}
      onViewportEnter={() => setVisible(true)}
    >
      <NumberFlow
        value={renderedValue}
        plugins={[continuous]}
        trend={1}
        locales="en-US"
        transformTiming={{
          duration,
          easing: "cubic-bezier(0.22, 1, 0.36, 1)",
        }}
        spinTiming={{
          duration,
          easing: "cubic-bezier(0.22, 1, 0.36, 1)",
        }}
        opacityTiming={{
          duration: 450,
          easing: "ease-out",
        }}
      />
    </motion.span>
  )
}
