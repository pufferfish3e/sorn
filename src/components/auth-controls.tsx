"use client"

import { SignInButton, useClerk, useUser } from "@clerk/nextjs"
import { Button } from "@/components/ui/button"
import { clearSornBrowserCache } from "@/lib/browser-cache"

export function AuthControls({ enabled }: { enabled: boolean }) {
  if (!enabled) {
    return null
  }

  return <ClerkAuthControls />
}

function ClerkAuthControls() {
  const { signOut } = useClerk()
  const { isLoaded, isSignedIn } = useUser()

  if (!isLoaded) {
    return null
  }

  async function handleSignOut() {
    clearSornBrowserCache()
    await signOut({ redirectUrl: "/" })
  }

  return (
    <div className="flex min-w-0 items-center gap-2">
      {isSignedIn ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => void handleSignOut()}
        >
          Sign out
        </Button>
      ) : (
        <SignInButton mode="modal">
          <Button type="button" variant="outline" size="sm">
            Sign in
          </Button>
        </SignInButton>
      )}
    </div>
  )
}
