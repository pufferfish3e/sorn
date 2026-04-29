import type { Metadata } from "next"
import { HomeLanding } from "@/components/home/home-landing"

export const metadata: Metadata = {
  alternates: {
    canonical: "/",
  },
  robots: {
    index: true,
    follow: true,
  },
}

export default function Home() {
  const authEnabled =
    Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) &&
    Boolean(process.env.CLERK_SECRET_KEY)

  return <HomeLanding authEnabled={authEnabled} />
}
