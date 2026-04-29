"use client"

import { useEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react"
import { AnimatePresence, motion, useReducedMotion } from "motion/react"
import {
  Bookmark,
  CalendarIcon,
  CheckCircle2,
  Clipboard,
  CornerDownLeft,
  Plus,
  Sparkles,
} from "lucide-react"
import { AuthControls } from "@/components/auth-controls"
import {
  ContactPopover,
  type ReminderContacts,
} from "@/components/dashboard/contact-panel"
import { OnboardingDialog } from "@/components/dashboard/onboarding-dialog"
import { SummaryPanel } from "@/components/dashboard/summary-panel"
import { WatchlistPanel } from "@/components/dashboard/watchlist-panel"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import {
  getDaysRemaining,
  getHostname,
  getTodayKey,
  getTrialProgress,
  getTrialStatus,
  isNotifyVia,
  normalizeUrl,
  parseDateKey,
  type NotifyVia,
  type Trial,
} from "@/lib/sorn"
import {
  clearSornBrowserCache,
  contactsStorageKey,
  trialsStorageKey,
} from "@/lib/browser-cache"

type SornDashboardProps = {
  authEnabled: boolean
}

type FormState = {
  url: string
  trialEndDate: string
  notifyVia: NotifyVia
}

type FormErrors = Partial<Record<"url" | "trialEndDate", string>>
type AddStep = "url" | "date" | "added"
type DurationOptionId = "7d" | "30d" | "3m" | "12m" | "manual" | "natural"
type NameInference = {
  name: string
  pending: boolean
}

type WebsitePreview = {
  serviceName: string
  faviconUrl: string
  imageUrl: string
  normalizedUrl: string
}

type ParsedTrialInput = {
  serviceName: string
  url: string
  trialEndDate: string
  days: number
}

type TrialDraft = Pick<
  Trial,
  "name" | "url" | "faviconUrl" | "imageUrl" | "trialEndDate" | "notifyVia"
>

const premiumEase = [0.77, 0, 0.175, 1] as const
const revealTransition = { duration: 0.7, ease: premiumEase }
const goldButtonClass =
  "border-primary/55 bg-[linear-gradient(135deg,#fff3b0_0%,#f0bd52_27%,#c47d1d_62%,#ffe09a_100%)] text-primary-foreground shadow-[0_0_58px_rgba(232,168,56,0.34),0_22px_80px_rgba(0,0,0,0.34),inset_0_1px_0_rgba(255,255,255,0.42),inset_0_-10px_22px_rgba(75,42,0,0.16)] hover:border-primary/70 hover:brightness-110"

const blankForm: FormState = {
  url: "",
  trialEndDate: "",
  notifyVia: "telegram",
}

const blankContacts: ReminderContacts = {
  telegram: "",
  whatsapp: "",
}

const durationOptions: Array<{
  id: Exclude<DurationOptionId, "manual" | "natural">
  label: string
}> = [
  { id: "7d", label: "7 days" },
  { id: "30d", label: "30 days" },
  { id: "3m", label: "3 months" },
  { id: "12m", label: "12 months" },
]

export function SornDashboard({ authEnabled }: SornDashboardProps) {
  const reduceMotion = useReducedMotion()
  const [todayKey, setTodayKey] = useState(() => getTodayKey())
  const [trials, setTrials] = useState<Trial[]>([])
  const [contacts, setContacts] = useState<ReminderContacts>(blankContacts)
  const [form, setForm] = useState<FormState>(blankForm)
  const [errors, setErrors] = useState<FormErrors>({})
  const [loaded, setLoaded] = useState(false)
  const [remoteLoaded, setRemoteLoaded] = useState(() => !authEnabled)
  const [addOpen, setAddOpen] = useState(false)
  const [addStep, setAddStep] = useState<AddStep>("url")
  const [durationOption, setDurationOption] = useState<DurationOptionId | "">("")
  const [manualCalendarMonth, setManualCalendarMonth] = useState(() =>
    dateKeyToLocalDate(getTodayKey())
  )
  const [naturalDateText, setNaturalDateText] = useState("")
  const [isParsingNaturalDate, setIsParsingNaturalDate] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [bookmarkletHref, setBookmarkletHref] = useState("#")
  const [nameInference, setNameInference] = useState<NameInference>({
    name: "",
    pending: false,
  })
  const [websitePreview, setWebsitePreview] = useState<WebsitePreview | null>(
    null
  )
  const [liveMessage, setLiveMessage] = useState("")
  const urlInputRef = useRef<HTMLInputElement>(null)
  const naturalDateInputRef = useRef<HTMLInputElement>(null)
  const durationPanelRef = useRef<HTMLDivElement>(null)
  const nameRequestIdRef = useRef(0)
  const initialUrlHandledRef = useRef(false)
  const selectTrialLengthRef = useRef<(option: DurationOptionId) => void>(
    () => undefined
  )

  useEffect(() => {
    if (!addOpen) {
      return
    }

    const frame = window.requestAnimationFrame(() => {
      if (addStep === "url") {
        urlInputRef.current?.focus()
      }

      if (addStep === "date") {
        durationPanelRef.current?.focus()
      }
    })

    return () => window.cancelAnimationFrame(frame)
  }, [addOpen, addStep])

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setTodayKey(getTodayKey())

      if (authEnabled) {
        clearSornBrowserCache()
        setTrials([])
        setContacts(blankContacts)
      } else {
        setTrials(readStoredTrials())
        setContacts(readStoredContacts())
      }

      setLoaded(true)
    }, 0)

    return () => window.clearTimeout(timeout)
  }, [authEnabled])

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      const saveUrl = `${window.location.origin}/dashboard?url=`
      const bookmarklet = `javascript:(()=>{window.open(${JSON.stringify(
        saveUrl
      )}+encodeURIComponent(location.href),'_blank')})()`

      setBookmarkletHref(bookmarklet)

      if (initialUrlHandledRef.current) {
        return
      }

      const params = new URLSearchParams(window.location.search)
      const url = params.get("url")

      if (!url) {
        return
      }

      initialUrlHandledRef.current = true
      setAddStep("url")
      setForm(blankForm)
      setErrors({})
      setDurationOption("")
      setNaturalDateText("")
      setManualCalendarMonth(dateKeyToLocalDate(getTodayKey()))
      setWebsitePreview(null)
      setNameInference({ name: "", pending: false })
      nameRequestIdRef.current += 1
      setAddOpen(true)
      window.requestAnimationFrame(() => {
        try {
          const normalizedUrl = normalizeUrl(url)
          setForm((current) => ({ ...current, url: normalizedUrl }))
          setAddStep("date")
        } catch {
          setErrors({ url: "Enter a valid website URL." })
        }
      })
    }, 0)

    return () => window.clearTimeout(timeout)
  }, [])

  useEffect(() => {
    const timer = window.setInterval(() => {
      setTodayKey(getTodayKey())
    }, 60_000)

    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    if (!authEnabled || !loaded) {
      return
    }

    async function loadRemoteData() {
      try {
        const response = await fetch("/api/trials", { cache: "no-store" })

        if (!response.ok) {
          throw new Error("Unable to load remote trials.")
        }

        const payload: unknown = await response.json()

        if (!isRecord(payload)) {
          throw new Error("Invalid remote trials response.")
        }

        if (Array.isArray(payload.trials)) {
          setTrials(payload.trials.filter(isStoredTrial))
        }

        if (isReminderContacts(payload.contacts)) {
          setContacts(payload.contacts)
        }
      } catch {
        setTrials([])
        setContacts(blankContacts)
        setLiveMessage("Could not load account data.")
      } finally {
        setRemoteLoaded(true)
      }
    }

    void loadRemoteData()
  }, [authEnabled, loaded])

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) {
        return
      }

      if (isEditableTarget(event.target)) {
        return
      }

      if (event.key.toLowerCase() === "a") {
        event.preventDefault()
        setAddOpen(true)
        setAddStep("url")
        setForm(blankForm)
        setErrors({})
        setDurationOption("")
        setNaturalDateText("")
        setManualCalendarMonth(dateKeyToLocalDate(getTodayKey()))
        setWebsitePreview(null)
        setNameInference({ name: "", pending: false })
        nameRequestIdRef.current += 1
      }
    }

    window.addEventListener("keydown", handleKeyDown)

    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [])

  const decoratedTrials = useMemo(() => {
    return trials
      .map((trial) => {
        const daysRemaining = getDaysRemaining(trial.trialEndDate, todayKey)
        const status = getTrialStatus(daysRemaining)

        return {
          trial,
          daysRemaining,
          status,
          progress: getTrialProgress(trial, todayKey),
        }
      })
      .sort(
        (a, b) =>
          parseDateKey(a.trial.trialEndDate) -
          parseDateKey(b.trial.trialEndDate)
      )
  }, [todayKey, trials])

  const visibleTrials = decoratedTrials.filter(
    ({ trial }) => !trial.cancelledAt
  )
  const activeCount = visibleTrials.filter(
    ({ status }) => status !== "expired"
  ).length
  const urgentCount = visibleTrials.filter(
    ({ daysRemaining }) => daysRemaining > 0 && daysRemaining <= 2
  ).length
  const nextTrial = visibleTrials.find(({ daysRemaining }) => daysRemaining > 0)
  const selectedTrialEndDate = form.trialEndDate
    ? dateKeyToLocalDate(form.trialEndDate)
    : undefined
  const tomorrow = addDays(dateKeyToLocalDate(todayKey), 1)

  useEffect(() => {
    if (!loaded || authEnabled) {
      return
    }

    window.localStorage.setItem(trialsStorageKey, JSON.stringify(trials))
  }, [authEnabled, loaded, trials])

  useEffect(() => {
    if (!loaded || authEnabled) {
      return
    }

    window.localStorage.setItem(contactsStorageKey, JSON.stringify(contacts))
  }, [authEnabled, contacts, loaded])

  function updateForm<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }))
    setErrors((current) => ({ ...current, [key]: undefined }))
  }

  function resetAddFlow() {
    setAddStep("url")
    setForm(blankForm)
    setErrors({})
    setDurationOption("")
    setNaturalDateText("")
    setManualCalendarMonth(dateKeyToLocalDate(getTodayKey()))
    setWebsitePreview(null)
    setNameInference({ name: "", pending: false })
    nameRequestIdRef.current += 1
  }

  function handleAddOpenChange(open: boolean) {
    setAddOpen(open)

    if (open) {
      resetAddFlow()
    }
  }

  function advanceFromUrl() {
    void processInitialInput(form.url)
  }

  async function processInitialInput(value: string) {
    const input = value.trim()

    if (!input) {
      setErrors({ url: "Enter a URL or trial note." })
      return
    }

    if (isLikelyUrlInput(input)) {
      try {
        const url = normalizeUrl(input)
        updateForm("url", url)
        inferNameFromUrl(url)
        setAddStep("date")
      } catch (error) {
        setErrors({
          url:
            error instanceof Error ? error.message : "Enter a valid website URL.",
        })
      }

      return
    }

    await addTrialFromNaturalInput(input)
  }

  async function addTrialFromNaturalInput(input: string) {
    if (isSubmitting || isParsingNaturalDate) {
      return
    }

    setIsParsingNaturalDate(true)
    setErrors({})

    try {
      const response = await fetch("/api/parse-trial-input", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: input, today: todayKey }),
      })

      if (!response.ok) {
        throw new Error("Could not parse trial.")
      }

      const payload: unknown = await response.json()
      const parsed = readTrialInputParse(payload)

      if (!parsed) {
        throw new Error("Invalid trial parse response.")
      }

      let preview: WebsitePreview | null = null

      try {
        preview = await fetchWebsitePreview(parsed.url)
      } catch {
        preview = null
      }

      updateForm("url", parsed.url)
      updateForm("trialEndDate", parsed.trialEndDate)
      setNameInference({ name: parsed.serviceName, pending: false })
      setWebsitePreview(preview)
      setLiveMessage(`Parsed ${parsed.days} day trial.`)

      await addTrialFromFlow(parsed.trialEndDate, {
        name: parsed.serviceName,
        url: preview?.normalizedUrl || parsed.url,
        preview,
      })
    } catch {
      setErrors({ url: "Try a URL or a note like \"Figma trial ends in 30 days\"." })
    } finally {
      setIsParsingNaturalDate(false)
    }
  }

  async function inferNameFromUrl(url: string) {
    const requestId = nameRequestIdRef.current + 1
    nameRequestIdRef.current = requestId
    setNameInference({ name: "", pending: true })
    setWebsitePreview(null)

    try {
      const preview = await fetchWebsitePreview(url)

      if (nameRequestIdRef.current !== requestId) {
        return
      }

      const name = preview.serviceName

      setNameInference({
        name: name || getServiceNameFromUrl(url),
        pending: false,
      })
      setWebsitePreview(preview)
    } catch {
      if (nameRequestIdRef.current !== requestId) {
        return
      }

      setNameInference({ name: getServiceNameFromUrl(url), pending: false })
    }
  }

  async function fetchWebsitePreview(url: string) {
    const response = await fetch("/api/generate-preview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    })

    if (!response.ok) {
      throw new Error("Preview generation failed.")
    }

    const payload: unknown = await response.json()
    const preview = readWebsitePreview(payload)

    if (!preview) {
      throw new Error("Invalid preview response.")
    }

    return preview
  }

  async function addTrialFromFlow(
    trialEndDate = form.trialEndDate,
    override: {
      name?: string
      url?: string
      preview?: WebsitePreview | null
    } = {}
  ) {
    if (isSubmitting) {
      return
    }

    const nextErrors: FormErrors = {}
    const endDate = trialEndDate
    let url = ""

    try {
      url = normalizeUrl(override.url ?? form.url)
    } catch (error) {
      nextErrors.url =
        error instanceof Error ? error.message : "Enter a valid website URL."
    }

    try {
      const daysRemaining = getDaysRemaining(endDate, todayKey)

      if (daysRemaining <= 0) {
        nextErrors.trialEndDate = "Choose a future date."
      }
    } catch {
      nextErrors.trialEndDate = "Choose a valid end date."
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors)
      return
    }

    let preview = override.preview ?? websitePreview

    if (!preview && nameInference.pending && !override.name) {
      try {
        preview = await fetchWebsitePreview(url)
        setWebsitePreview(preview)
        setNameInference({ name: preview.serviceName, pending: false })
      } catch {
        preview = null
      }
    }

    const inferredName =
      override.name ||
      preview?.serviceName ||
      nameInference.name ||
      getServiceNameFromUrl(url)
    const trialUrl = preview?.normalizedUrl || url

    setIsSubmitting(true)

    try {
      const trial = authEnabled
        ? await createRemoteTrial({
            name: inferredName,
            url: trialUrl,
            faviconUrl: preview?.faviconUrl,
            imageUrl: preview?.imageUrl,
            trialEndDate: endDate,
            notifyVia: form.notifyVia,
          })
        : createLocalTrial({
            name: inferredName,
            url: trialUrl,
            faviconUrl: preview?.faviconUrl,
            imageUrl: preview?.imageUrl,
            trialEndDate: endDate,
            notifyVia: form.notifyVia,
            todayKey,
          })

      setTrials((current) => [trial, ...current])
      setForm(blankForm)
      setErrors({})
      setDurationOption("")
      setNaturalDateText("")
      setAddStep("added")
      setLiveMessage("All set. Reminder scheduled.")
      window.setTimeout(() => handleAddOpenChange(false), 1500)
    } catch {
      setLiveMessage("Could not save trial.")
      setErrors({ trialEndDate: "Could not save. Try again." })
    } finally {
      setIsSubmitting(false)
    }
  }

  function handleAddTrial(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (addStep === "url") {
      advanceFromUrl()
      return
    }

    if (addStep === "date") {
      void addTrialFromFlow()
    }
  }

  function selectTrialLength(option: DurationOptionId) {
    if (isSubmitting || isParsingNaturalDate) {
      return
    }

    setErrors((current) => ({ ...current, trialEndDate: undefined }))

    if (option === "manual") {
      setDurationOption((current) => (current === "manual" ? "" : "manual"))
      setManualCalendarMonth(selectedTrialEndDate ?? tomorrow)
      window.requestAnimationFrame(() => durationPanelRef.current?.focus())
      return
    }

    if (option === "natural") {
      startNaturalDateEntry()
      return
    }

    setDurationOption(option)
    const trialEndDate = getTrialEndDateForDuration(option, todayKey)
    updateForm("trialEndDate", trialEndDate)
    void addTrialFromFlow(trialEndDate)
  }

  function startNaturalDateEntry() {
    setDurationOption("natural")
    setErrors((current) => ({ ...current, trialEndDate: undefined }))
    window.requestAnimationFrame(() => naturalDateInputRef.current?.focus())
  }

  function stopNaturalDateEntry() {
    naturalDateInputRef.current?.blur()
    window.requestAnimationFrame(() => durationPanelRef.current?.focus())
  }

  async function parseNaturalTrialDate() {
    const text = naturalDateText.trim()

    if (!text || isSubmitting || isParsingNaturalDate) {
      setErrors((current) => ({
        ...current,
        trialEndDate: "Type a trial length or end date.",
      }))
      return
    }

    setIsParsingNaturalDate(true)
    setErrors((current) => ({ ...current, trialEndDate: undefined }))

    try {
      const response = await fetch("/api/parse-trial-date", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, today: todayKey }),
      })

      if (!response.ok) {
        throw new Error("Could not parse date.")
      }

      const payload: unknown = await response.json()
      const parsed = readNaturalDateParse(payload)

      if (!parsed) {
        throw new Error("Invalid date parse response.")
      }

      updateForm("trialEndDate", parsed.trialEndDate)
      setLiveMessage(`Parsed ${parsed.days} day trial.`)
      void addTrialFromFlow(parsed.trialEndDate)
    } catch {
      setErrors((current) => ({
        ...current,
        trialEndDate: "Could not understand that date.",
      }))
    } finally {
      setIsParsingNaturalDate(false)
    }
  }

  useEffect(() => {
    selectTrialLengthRef.current = selectTrialLength
  })

  function handleDurationShortcut(event: KeyboardEvent | ReactKeyboardEvent) {
    if (!addOpen || addStep !== "date") {
      return
    }

    if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) {
      return
    }

    if (isEditableTarget(event.target)) {
      return
    }

    if (event.key === "5") {
      event.preventDefault()
      startNaturalDateEntry()
      return
    }

    if (durationOption === "manual" && event.key === "ArrowLeft") {
      event.preventDefault()
      setManualCalendarMonth((current) => addMonths(current, -1))
      return
    }

    if (durationOption === "manual" && event.key === "ArrowRight") {
      event.preventDefault()
      setManualCalendarMonth((current) => addMonths(current, 1))
      return
    }

    const option = durationOptions[Number(event.key) - 1]

    if (!option) {
      return
    }

    event.preventDefault()
    selectTrialLengthRef.current(option.id)
  }

  useEffect(() => {
    function handleGlobalDurationKeyDown(event: KeyboardEvent) {
      if (!addOpen || addStep !== "date") {
        return
      }

      if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) {
        return
      }

      if (isEditableTarget(event.target)) {
        return
      }

      if (event.key === "5") {
        event.preventDefault()
        startNaturalDateEntry()
        return
      }

      if (durationOption === "manual" && event.key === "ArrowLeft") {
        event.preventDefault()
        setManualCalendarMonth((current) => addMonths(current, -1))
        return
      }

      if (durationOption === "manual" && event.key === "ArrowRight") {
        event.preventDefault()
        setManualCalendarMonth((current) => addMonths(current, 1))
        return
      }

      const option = durationOptions[Number(event.key) - 1]

      if (!option) {
        return
      }

      event.preventDefault()
      selectTrialLengthRef.current(option.id)
    }

    window.addEventListener("keydown", handleGlobalDurationKeyDown)

    return () =>
      window.removeEventListener("keydown", handleGlobalDurationKeyDown)
  }, [addOpen, addStep, durationOption])

  async function pasteUrl() {
    try {
      const text = await navigator.clipboard.readText()
      updateForm("url", text)
      setLiveMessage("Input pasted.")

      if (isLikelyUrlInput(text)) {
        await processInitialInput(text)
        return
      }

      window.requestAnimationFrame(() => urlInputRef.current?.focus())
    } catch {
      setErrors({ url: "Clipboard access was blocked." })
    }
  }

  async function copyBookmarklet() {
    if (!bookmarkletHref || bookmarkletHref === "#") {
      setLiveMessage("Bookmarklet unavailable.")
      return
    }

    try {
      await navigator.clipboard.writeText(bookmarkletHref)
      setLiveMessage("Save tab copied.")
    } catch {
      setLiveMessage("Could not copy save tab.")
    }
  }

  async function markCancelled(id: string) {
    const previousTrials = trials

    setTrials((current) =>
      current.map((trial) =>
        trial.id === id
          ? { ...trial, cancelledAt: new Date().toISOString() }
          : trial
      )
    )

    try {
      if (authEnabled) {
        await updateRemoteTrial(id)
      }

      setLiveMessage("Marked cancelled.")
    } catch {
      setTrials(previousTrials)
      setLiveMessage("Could not mark cancelled.")
    }
  }

  async function saveContacts(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    await saveContactValues()
  }

  async function saveContactValues(nextContacts = contacts) {
    try {
      if (authEnabled) {
        const savedContacts = await saveRemoteContacts(nextContacts)
        setContacts(savedContacts)
      } else {
        setContacts(nextContacts)
      }

      setLiveMessage("Channels saved.")
      return true
    } catch {
      setLiveMessage("Could not save channels.")
      return false
    }
  }

  return (
    <>
      {authEnabled && (
        <OnboardingDialog
          dataReady={loaded && remoteLoaded}
          contacts={contacts}
          onContactsChange={setContacts}
        />
      )}
      <Dialog open={addOpen} onOpenChange={handleAddOpenChange}>
      <motion.main
        id="main"
        className="min-h-screen bg-background px-3 py-5 text-foreground sm:px-4 lg:px-5"
        initial={reduceMotion ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={revealTransition}
      >
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 pb-24">
          <motion.header
            className="flex min-h-12 items-center justify-between gap-3"
            initial={reduceMotion ? false : { opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={revealTransition}
          >
            <div className="min-w-0">
              <div className="flex min-w-0 items-center gap-2">
                <h1 className="text-3xl leading-none font-semibold tracking-normal text-foreground md:text-4xl">
                  Sorn
                </h1>
                <ContactPopover
                  contacts={contacts}
                  onChange={setContacts}
                  onSubmit={saveContacts}
                />
              </div>
              <p className="mt-1 font-mono text-[11px] text-muted-foreground md:text-[12px]">
                {todayKey}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <AuthControls enabled={authEnabled} />
              <DialogTrigger
                render={
                  <Button
                    type="button"
                    size="sm"
                    className={goldButtonClass}
                  />
                }
              >
                <Plus data-icon="inline-start" aria-hidden="true" />
                Add
              </DialogTrigger>
            </div>
          </motion.header>

          <SummaryPanel
            activeCount={activeCount}
            urgentCount={urgentCount}
            nextTrial={nextTrial}
            reduceMotion={Boolean(reduceMotion)}
          />

          <WatchlistPanel
            visibleTrials={visibleTrials}
            reduceMotion={Boolean(reduceMotion)}
            onCancel={markCancelled}
          />
        </div>

        <DialogTrigger
          render={
            <Button
              type="button"
              size="icon-lg"
              aria-label="Add trial"
              className={`${goldButtonClass} fixed bottom-[calc(1rem+env(safe-area-inset-bottom))] right-4 sm:hidden`}
            />
          }
        >
          <Plus aria-hidden="true" />
        </DialogTrigger>
      </motion.main>

      <DialogContent className="rounded-[18px] bg-popover/92 p-4 text-center shadow-[0_28px_100px_rgba(0,0,0,0.45)] ring-border supports-backdrop-filter:backdrop-blur-xl">
        <motion.form
          layout={!reduceMotion}
          onSubmit={handleAddTrial}
          noValidate
          transition={{ duration: 0.22, ease: premiumEase }}
        >
          <DialogHeader className="items-center text-center">
            <DialogTitle className="text-xl font-semibold">
              {addStep === "url" && "Add trial"}
              {addStep === "date" && "How long?"}
              {addStep === "added" && "All set!"}
            </DialogTitle>
            <DialogDescription className="sr-only">
              Add a trial end date and reminder channel.
            </DialogDescription>
          </DialogHeader>

          <motion.div layout={!reduceMotion} className="mt-4">
            <AnimatePresence mode="wait" initial={false}>
              {addStep === "url" && (
                <motion.div
                  key="url-step"
                  initial={reduceMotion ? false : { opacity: 0, y: 8, scale: 0.985 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -8, scale: 0.985 }}
                  transition={{ duration: 0.22, ease: premiumEase }}
                >
                  <FieldGroup>
                    <Field data-invalid={errors.url ? true : undefined}>
                      <FieldLabel htmlFor="website-url" className="sr-only">
                        URL or trial note
                      </FieldLabel>
                      <InputGroup className="h-11">
                        <InputGroupInput
                          ref={urlInputRef}
                          id="website-url"
                          name="websiteUrl"
                          type="text"
                          value={form.url}
                          onChange={(event) =>
                            updateForm("url", event.target.value)
                          }
                          onPaste={(event) => {
                            const text = event.clipboardData.getData("text")

                            if (!isLikelyUrlInput(text)) {
                              return
                            }

                            event.preventDefault()
                            updateForm("url", text)
                            void processInitialInput(text)
                          }}
                          placeholder="netflix.com or Figma ends in 30 days"
                          autoComplete="url"
                          spellCheck={false}
                          aria-invalid={errors.url ? true : undefined}
                          className="h-11 text-center text-[16px]"
                        />
                        <InputGroupAddon align="inline-end">
                          <InputGroupButton
                            type="button"
                            size="icon-sm"
                            aria-label="Paste"
                            onClick={pasteUrl}
                          >
                            <Clipboard aria-hidden="true" />
                          </InputGroupButton>
                        </InputGroupAddon>
                      </InputGroup>
                      <FieldError>{errors.url}</FieldError>
                      <Button
                        type="button"
                        variant="ghost"
                        size="xs"
                        className="mx-auto"
                        onClick={copyBookmarklet}
                      >
                        <Bookmark data-icon="inline-start" aria-hidden="true" />
                        Copy save tab
                      </Button>
                    </Field>
                  </FieldGroup>
                </motion.div>
              )}

              {addStep === "date" && (
                <motion.div
                  ref={durationPanelRef}
                  key="date-step"
                  tabIndex={-1}
                  onKeyDown={handleDurationShortcut}
                  className="outline-none"
                  initial={reduceMotion ? false : { opacity: 0, y: 8, scale: 0.985 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -8, scale: 0.985 }}
                  transition={{ duration: 0.22, ease: premiumEase }}
                >
                  <FieldGroup>
                    <Field
                      data-invalid={errors.trialEndDate ? true : undefined}
                      className="items-center"
                    >
                      <FieldLabel htmlFor="trial-end" className="sr-only">
                        Free trial end date
                      </FieldLabel>
                      <ToggleGroup
                        aria-label="Trial length"
                        value={durationOption ? [durationOption] : []}
                        onValueChange={(value) => {
                          const [next] = value

                          if (isDurationOption(next)) {
                            selectTrialLength(next)
                          }
                        }}
                        variant="outline"
                        spacing={2}
                        className="grid w-full grid-cols-2"
                      >
                        {durationOptions.map((option, index) => (
                          <ToggleGroupItem
                            key={option.id}
                            value={option.id}
                            disabled={isSubmitting}
                            className="relative h-12 min-w-0 justify-center pr-6 aria-pressed:bg-primary aria-pressed:text-primary-foreground"
                          >
                            {option.label}
                            <kbd className="absolute bottom-1 right-1.5 font-mono text-[9px] text-muted-foreground/70 group-data-[state=on]/toggle:text-primary-foreground/70">
                              {index + 1}
                            </kbd>
                          </ToggleGroupItem>
                        ))}
                      </ToggleGroup>
                      <Button
                        type="button"
                        variant={durationOption === "manual" ? "secondary" : "ghost"}
                        size="sm"
                        className="mt-3 w-full"
                        disabled={isSubmitting || isParsingNaturalDate}
                        onClick={() => selectTrialLength("manual")}
                      >
                        <CalendarIcon data-icon="inline-start" aria-hidden="true" />
                        Select an end date
                      </Button>
                      <Button
                        type="button"
                        variant={durationOption === "natural" ? "secondary" : "ghost"}
                        size="sm"
                        className="relative mt-2 w-full"
                        disabled={isSubmitting || isParsingNaturalDate}
                        onClick={() => selectTrialLength("natural")}
                      >
                        <Sparkles data-icon="inline-start" aria-hidden="true" />
                        Type a date
                        <kbd className="absolute bottom-1 right-1.5 font-mono text-[9px] text-muted-foreground/70">
                          5
                        </kbd>
                      </Button>
                      <AnimatePresence initial={false}>
                        {durationOption === "manual" && (
                          <motion.div
                            key="manual-calendar"
                            initial={
                              reduceMotion
                                ? false
                                : { opacity: 0, y: 8, height: 0 }
                            }
                            animate={{ opacity: 1, y: 0, height: "auto" }}
                            exit={{ opacity: 0, y: -6, height: 0 }}
                            transition={{ duration: 0.2, ease: premiumEase }}
                            className="overflow-hidden"
                          >
                            <div className="mt-3 flex min-h-78 items-start justify-center overflow-hidden rounded-[14px] bg-muted/20 p-2">
                              <Calendar
                                id="trial-end"
                                mode="single"
                                month={manualCalendarMonth}
                                onMonthChange={setManualCalendarMonth}
                                selected={selectedTrialEndDate}
                                disabled={{ before: tomorrow }}
                                onSelect={(date) => {
                                  if (!date) {
                                    return
                                  }

                                  const trialEndDate = dateToKey(date)
                                  updateForm("trialEndDate", trialEndDate)
                                  void addTrialFromFlow(trialEndDate)
                                }}
                                className="rounded-[14px] bg-transparent p-0 [--cell-size:--spacing(8)]"
                              />
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                      <AnimatePresence initial={false}>
                        {durationOption === "natural" && (
                          <motion.div
                            key="natural-date"
                            initial={
                              reduceMotion
                                ? false
                                : { opacity: 0, y: 8, height: 0 }
                            }
                            animate={{ opacity: 1, y: 0, height: "auto" }}
                            exit={{ opacity: 0, y: -6, height: 0 }}
                            transition={{ duration: 0.2, ease: premiumEase }}
                            className="overflow-hidden"
                          >
                            <InputGroup className="mt-3 h-11">
                              <InputGroupInput
                                ref={naturalDateInputRef}
                                value={naturalDateText}
                                onChange={(event) =>
                                  setNaturalDateText(event.target.value)
                                }
                                onKeyDown={(event) => {
                                  if (event.key === "Escape") {
                                    event.preventDefault()
                                    stopNaturalDateEntry()
                                    return
                                  }

                                  if (event.key === "Enter") {
                                    event.preventDefault()
                                    void parseNaturalTrialDate()
                                  }
                                }}
                                placeholder="next Friday, 45 days, end of May"
                                autoComplete="off"
                                spellCheck={false}
                                aria-label="Natural language trial end date"
                                aria-invalid={
                                  errors.trialEndDate ? true : undefined
                                }
                                disabled={isSubmitting || isParsingNaturalDate}
                                className="h-11 text-left text-[16px]"
                              />
                              <InputGroupAddon align="inline-end">
                                <InputGroupButton
                                  type="button"
                                  size="sm"
                                  disabled={isSubmitting || isParsingNaturalDate}
                                  onClick={() => void parseNaturalTrialDate()}
                                >
                                  {isParsingNaturalDate ? "..." : "Parse"}
                                </InputGroupButton>
                              </InputGroupAddon>
                            </InputGroup>
                            <p className="mt-2 text-center font-mono text-[11px] text-muted-foreground">
                              Esc returns focus to shortcuts.
                            </p>
                          </motion.div>
                        )}
                      </AnimatePresence>
                      <FieldError>{errors.trialEndDate}</FieldError>
                    </Field>
                  </FieldGroup>
                </motion.div>
              )}

              {addStep === "added" && (
                <motion.div
                  key="added-step"
                  className="flex min-h-44 flex-col items-center justify-center gap-4"
                  initial={reduceMotion ? false : { opacity: 0, y: 10, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  transition={
                    reduceMotion
                      ? { duration: 0 }
                      : { type: "spring", stiffness: 280, damping: 26, mass: 0.8 }
                  }
                >
                  <motion.div className="relative grid size-20 place-items-center">
                    <motion.span
                      aria-hidden="true"
                      className="absolute inset-0 rounded-full bg-success/10"
                      initial={reduceMotion ? false : { scale: 0.64, opacity: 0 }}
                      animate={
                        reduceMotion
                          ? { opacity: 1 }
                          : { scale: [0.64, 1.18, 1.05], opacity: [0, 1, 0] }
                      }
                      transition={{ duration: 0.72, ease: premiumEase }}
                    />
                    <motion.span
                      aria-hidden="true"
                      className="absolute inset-2 rounded-full border border-success/25"
                      initial={reduceMotion ? false : { scale: 0.82, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ duration: 0.36, ease: premiumEase }}
                    />
                    <motion.div
                      className="relative grid size-16 place-items-center rounded-full bg-success-muted text-success shadow-[0_16px_48px_rgba(34,197,94,0.16)]"
                      initial={reduceMotion ? false : { scale: 0.72, rotate: -8 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={
                        reduceMotion
                          ? { duration: 0 }
                          : {
                              type: "spring",
                              stiffness: 420,
                              damping: 18,
                              mass: 0.7,
                            }
                      }
                    >
                      <CheckCircle2 aria-hidden="true" />
                    </motion.div>
                  </motion.div>
                  <motion.div
                    className="flex flex-col items-center gap-1"
                    initial={reduceMotion ? false : { opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.32, delay: 0.08, ease: premiumEase }}
                  >
                    <p className="text-lg font-medium md:text-xl">All set!</p>
                    <p className="max-w-58 text-sm text-muted-foreground md:text-base">
                      We&apos;ll remind you 1 day before your trial ends.
                    </p>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {addStep === "url" && (
            <Button
              type="submit"
              className="mt-4 w-full"
              disabled={isSubmitting || isParsingNaturalDate}
            >
              <CornerDownLeft data-icon="inline-start" aria-hidden="true" />
              {isParsingNaturalDate ? "Adding..." : "Continue"}
            </Button>
          )}
        </motion.form>
      </DialogContent>

      <p className="sr-only" aria-live="polite">
        {liveMessage}
      </p>
      </Dialog>
    </>
  )
}

function getServiceNameFromUrl(url: string) {
  const hostname = getHostname(url)
  const parts = hostname.split(".").filter(Boolean)
  const meaningfulPart = parts.length > 1 ? parts.at(-2) : parts[0]

  if (!meaningfulPart) {
    return hostname || "Trial"
  }

  return meaningfulPart
    .split(/[-_]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
}

function createLocalTrial({
  todayKey,
  ...draft
}: TrialDraft & { todayKey: string }): Trial {
  return {
    id: crypto.randomUUID(),
    ...draft,
    createdAt: todayKey,
    cancelledAt: null,
  }
}

async function createRemoteTrial(draft: TrialDraft) {
  const response = await fetch("/api/trials", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(draft),
  })

  if (!response.ok) {
    throw new Error("Unable to create remote trial.")
  }

  const payload: unknown = await response.json()

  if (!isRecord(payload) || !isStoredTrial(payload.trial)) {
    throw new Error("Invalid remote trial response.")
  }

  return payload.trial
}

async function updateRemoteTrial(id: string) {
  const response = await fetch(`/api/trials/${encodeURIComponent(id)}`, {
    method: "PATCH",
  })

  if (!response.ok) {
    throw new Error("Unable to update remote trial.")
  }
}

async function saveRemoteContacts(contacts: ReminderContacts) {
  const response = await fetch("/api/reminder-contacts", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(contacts),
  })

  if (!response.ok) {
    throw new Error("Unable to save remote contacts.")
  }

  const payload: unknown = await response.json()

  if (!isRecord(payload) || !isReminderContacts(payload.contacts)) {
    throw new Error("Invalid remote contacts response.")
  }

  return payload.contacts
}

function addDays(date: Date, days: number) {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

function addMonths(date: Date, months: number) {
  const next = new Date(date)
  next.setMonth(next.getMonth() + months)
  return next
}

function getTrialEndDateForDuration(
  duration: Exclude<DurationOptionId, "manual" | "natural">,
  todayKey: string
) {
  const today = dateKeyToLocalDate(todayKey)

  if (duration === "7d") {
    return dateToKey(addDays(today, 7))
  }

  if (duration === "30d") {
    return dateToKey(addDays(today, 30))
  }

  if (duration === "3m") {
    return dateToKey(addMonths(today, 3))
  }

  return dateToKey(addMonths(today, 12))
}

function dateKeyToLocalDate(value: string) {
  const [year, month, day] = value.split("-").map(Number)
  return new Date(year, month - 1, day)
}

function dateToKey(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")

  return `${year}-${month}-${day}`
}

function readStoredTrials() {
  try {
    const stored = window.localStorage.getItem(trialsStorageKey)

    if (!stored) {
      return []
    }

    const parsed: unknown = JSON.parse(stored)

    if (!Array.isArray(parsed)) {
      return []
    }

    return parsed.filter(isStoredTrial)
  } catch (error) {
    console.error("Unable to read stored trials.", error)
    return []
  }
}

function readStoredContacts() {
  try {
    const stored = window.localStorage.getItem(contactsStorageKey)

    if (!stored) {
      return blankContacts
    }

    const parsed: unknown = JSON.parse(stored)

    if (!isRecord(parsed)) {
      return blankContacts
    }

    return {
      telegram: typeof parsed.telegram === "string" ? parsed.telegram : "",
      whatsapp: typeof parsed.whatsapp === "string" ? parsed.whatsapp : "",
    }
  } catch (error) {
    console.error("Unable to read stored reminder contacts.", error)
    return blankContacts
  }
}

function isReminderContacts(value: unknown): value is ReminderContacts {
  return (
    isRecord(value) &&
    typeof value.telegram === "string" &&
    typeof value.whatsapp === "string"
  )
}

function readWebsitePreview(value: unknown): WebsitePreview | null {
  if (!isRecord(value)) {
    return null
  }

  const serviceName =
    typeof value.service_name === "string" ? value.service_name : ""
  const faviconUrl =
    typeof value.favicon_url === "string" ? value.favicon_url : ""
  const imageUrl = typeof value.image_url === "string" ? value.image_url : ""
  const normalizedUrl =
    typeof value.normalized_url === "string" ? value.normalized_url : ""

  if (!serviceName || !faviconUrl || !imageUrl || !normalizedUrl) {
    return null
  }

  return { serviceName, faviconUrl, imageUrl, normalizedUrl }
}

function readTrialInputParse(value: unknown): ParsedTrialInput | null {
  if (!isRecord(value)) {
    return null
  }

  const serviceName =
    typeof value.service_name === "string" ? value.service_name.trim() : ""
  const url = typeof value.url === "string" ? value.url : ""
  const trialEndDate =
    typeof value.trial_end_date === "string" ? value.trial_end_date : ""
  const days = typeof value.days === "number" ? value.days : 0

  if (!serviceName || !url || days <= 0) {
    return null
  }

  let normalizedUrl = ""

  try {
    normalizedUrl = normalizeUrl(url)
    parseDateKey(trialEndDate)
  } catch {
    return null
  }

  return {
    serviceName,
    url: normalizedUrl,
    trialEndDate,
    days,
  }
}

function readNaturalDateParse(value: unknown) {
  if (!isRecord(value)) {
    return null
  }

  const trialEndDate =
    typeof value.trial_end_date === "string" ? value.trial_end_date : ""
  const days = typeof value.days === "number" ? value.days : 0

  if (!trialEndDate || days <= 0) {
    return null
  }

  try {
    parseDateKey(trialEndDate)
  } catch {
    return null
  }

  return { trialEndDate, days }
}

function isLikelyUrlInput(value: string) {
  const trimmed = value.trim()

  if (!trimmed || /\s/.test(trimmed)) {
    return false
  }

  return (
    /^https?:\/\//i.test(trimmed) ||
    /^localhost(?::\d+)?(?:\/|$)/i.test(trimmed) ||
    /^[^\s@]+\.[^\s@]{2,}(?:\/.*)?$/i.test(trimmed)
  )
}

function isEditableTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false
  }

  const tagName = target.tagName.toLowerCase()

  return (
    tagName === "input" ||
    tagName === "textarea" ||
    tagName === "select" ||
    target.isContentEditable
  )
}

function isDurationOption(value: string | undefined): value is DurationOptionId {
  return (
    value === "7d" ||
    value === "30d" ||
    value === "3m" ||
    value === "12m" ||
    value === "manual" ||
    value === "natural"
  )
}

function isStoredTrial(value: unknown): value is Trial {
  if (!isRecord(value)) {
    return false
  }

  if (
    typeof value.id !== "string" ||
    typeof value.name !== "string" ||
    typeof value.url !== "string" ||
    typeof value.trialEndDate !== "string" ||
    typeof value.createdAt !== "string" ||
    typeof value.notifyVia !== "string" ||
    !isNotifyVia(value.notifyVia)
  ) {
    return false
  }

  try {
    parseDateKey(value.trialEndDate)
    parseDateKey(value.createdAt)
  } catch {
    return false
  }

  return (
    value.cancelledAt === undefined ||
    value.cancelledAt === null ||
    typeof value.cancelledAt === "string"
  )
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}
