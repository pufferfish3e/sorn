import { SornDashboard } from "@/components/sorn-dashboard"

export default function DashboardPage() {
  const authEnabled =
    Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) &&
    Boolean(process.env.CLERK_SECRET_KEY)

  return <SornDashboard authEnabled={authEnabled} />
}
