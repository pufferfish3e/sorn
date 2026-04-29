export function getSiteUrl() {
  const explicitUrl = process.env.NEXT_PUBLIC_SITE_URL
  const vercelProductionUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL

  if (explicitUrl) {
    return new URL(explicitUrl)
  }

  if (vercelProductionUrl) {
    return new URL(`https://${vercelProductionUrl}`)
  }

  return new URL("http://localhost:3000")
}
