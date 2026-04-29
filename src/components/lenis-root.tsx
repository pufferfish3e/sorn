"use client"

import { ReactLenis } from "lenis/react"

export function LenisRoot({ children }: { children: React.ReactNode }) {
  return (
    <ReactLenis
      root
      options={{
        lerp: 0.09,
        wheelMultiplier: 0.85,
        touchMultiplier: 1,
        syncTouch: false,
      }}
    >
      {children}
    </ReactLenis>
  )
}
