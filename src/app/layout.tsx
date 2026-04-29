import type { Metadata } from "next"
import { ClerkProvider } from "@clerk/nextjs"
import { Geist, Geist_Mono, Playfair_Display } from "next/font/google"
import { LenisRoot } from "@/components/lenis-root"
import "./globals.css"

const geist = Geist({
  variable: "--font-geist",
  subsets: ["latin"],
  display: "swap",
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
})

const playfairDisplay = Playfair_Display({
  variable: "--font-playfair-display",
  subsets: ["latin"],
  display: "swap",
  style: ["italic"],
})

export const metadata: Metadata = {
  title: "Sorn",
  description: "Subscription watchdog. Never get charged.",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const hasClerk =
    Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) &&
    Boolean(process.env.CLERK_SECRET_KEY)

  const document = (
    <html
      lang="en"
      className={`${geist.className} ${geist.variable} ${geistMono.variable} ${playfairDisplay.variable} dark h-full antialiased`}
    >
      <body className="min-h-full bg-background text-foreground">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:rounded-md focus:bg-primary focus:px-3 focus:py-2 focus:text-sm focus:font-medium focus:text-primary-foreground focus:ring-3 focus:ring-ring/40"
        >
          Skip to main content
        </a>
        <LenisRoot>{children}</LenisRoot>
      </body>
    </html>
  )

  if (!hasClerk) {
    return document
  }

  return <ClerkProvider afterSignOutUrl="/">{document}</ClerkProvider>
}
