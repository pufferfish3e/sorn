import type { Metadata } from "next"
import { SornDashboard } from "@/components/sorn-dashboard"

export const metadata: Metadata = {
  title: "Dashboard",
  description: "Your private Sorn trial watchlist.",
  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false,
    },
  },
}

export default function DashboardPage() {
  const authEnabled =
    Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) &&
    Boolean(process.env.CLERK_SECRET_KEY)

  return <SornDashboard authEnabled={authEnabled} />
}
