export function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(" ");
}

export function formatPhoneNumberForCall(phone: any): string {
  try {
    if (!phone) return ""
    const str = String(phone)
    const clean = str.replace(/\D/g, '')
    if (!clean) return ""

    if (clean.startsWith('0')) return `+38${clean}`
    if (clean.startsWith('380')) return `+${clean}`
    if (clean.length === 9) return `+380${clean}`

    return clean.startsWith('+') ? clean : `+${clean}`
  } catch (e) {
    console.error("Phone formatting error:", e)
    return ""
  }
}

export function generateId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
}
