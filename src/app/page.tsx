import { HomeLanding } from "@/components/home/home-landing"

export default function Home() {
  const authEnabled =
    Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) &&
    Boolean(process.env.CLERK_SECRET_KEY)

  return <HomeLanding authEnabled={authEnabled} />
}
