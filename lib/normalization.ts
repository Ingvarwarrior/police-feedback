const UK_LOCALE = "uk-UA"

function collapseWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim()
}

function toTitleCaseWord(word: string): string {
  return word
    .split("-")
    .map((part) =>
      part
        .split("'")
        .map((token) =>
          token
            ? `${token.charAt(0).toLocaleUpperCase(UK_LOCALE)}${token.slice(1).toLocaleLowerCase(UK_LOCALE)}`
            : token
        )
        .join("'")
    )
    .join("-")
}

export function normalizePersonName(value?: string | null): string | null {
  if (typeof value !== "string") return null
  const cleaned = collapseWhitespace(value.replace(/[’`]/g, "'"))
  if (!cleaned) return null
  return cleaned
    .split(" ")
    .map((word) => toTitleCaseWord(word))
    .join(" ")
}

export function normalizePhoneNumber(value?: string | null): string | null {
  if (typeof value !== "string") return null
  const cleaned = collapseWhitespace(value)
  if (!cleaned) return null

  const digits = cleaned.replace(/\D/g, "")
  if (!digits) return null

  if (digits.startsWith("380") && digits.length === 12) {
    return `+${digits}`
  }
  if (digits.startsWith("0") && digits.length === 10) {
    return `+38${digits}`
  }
  if (digits.length === 9) {
    return `+380${digits}`
  }
  if (cleaned.startsWith("+")) {
    return `+${digits}`
  }

  return `+${digits}`
}

export function normalizeEoNumber(value?: string | null): string | null {
  if (typeof value !== "string") return null
  const cleaned = collapseWhitespace(value).replace(/^№\s*/iu, "")
  return cleaned || null
}

export function normalizeUsername(value?: string | null): string | null {
  if (typeof value !== "string") return null
  const cleaned = collapseWhitespace(value).toLowerCase()
  return cleaned || null
}

export function normalizeBadgeNumber(value?: string | null): string | null {
  if (typeof value !== "string") return null
  const cleaned = collapseWhitespace(value)
  return cleaned || null
}

