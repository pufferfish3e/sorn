export const trialsStorageKey = "sorn.trials.v1"
export const contactsStorageKey = "sorn.contacts.v1"

export function clearSornBrowserCache() {
  if (typeof window === "undefined") {
    return
  }

  window.localStorage.removeItem(trialsStorageKey)
  window.localStorage.removeItem(contactsStorageKey)
}
