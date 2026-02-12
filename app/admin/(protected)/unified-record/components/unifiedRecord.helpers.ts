export type ForceKey = "weapon" | "tearGas" | "baton" | "handcuffs" | "force"

export type ForceUsage = Record<
    ForceKey,
    {
        enabled: boolean
        date: string
        time: string
        from: string
        to: string
    }
>

export type LegalKey =
    | "art44_p1_force"
    | "art45_p1_a_handcuffs"
    | "art45_p1_b_handcuffs"
    | "art45_p1_v_handcuffs"
    | "art45_p1_g_handcuffs"
    | "art45_p1_gg_handcuffs"
    | "art45_p2_a_baton"
    | "art45_p2_b_baton"
    | "art45_p2_v_baton"
    | "art45_p3_a_teargas"
    | "art45_p3_b_teargas"

export type LegalBasisState = Record<LegalKey, boolean>

export const forceLabels: Record<ForceKey, string> = {
    weapon: "Зброя",
    tearGas: "Засоби, споряджені речовинами сльозогінної та дратівної дії",
    baton: "Гумовий кийок",
    handcuffs: "Кайданки",
    force: "Фізична сила",
}

export const getInitialForceUsage = (): ForceUsage => ({
    weapon: { enabled: false, date: "", time: "", from: "", to: "" },
    tearGas: { enabled: false, date: "", time: "", from: "", to: "" },
    baton: { enabled: false, date: "", time: "", from: "", to: "" },
    handcuffs: { enabled: false, date: "", time: "", from: "", to: "" },
    force: { enabled: false, date: "", time: "", from: "", to: "" },
})

export const getInitialLegalBasis = (): LegalBasisState => ({
    art44_p1_force: false,
    art45_p1_a_handcuffs: false,
    art45_p1_b_handcuffs: false,
    art45_p1_v_handcuffs: false,
    art45_p1_g_handcuffs: false,
    art45_p1_gg_handcuffs: false,
    art45_p2_a_baton: false,
    art45_p2_b_baton: false,
    art45_p2_v_baton: false,
    art45_p3_a_teargas: false,
    art45_p3_b_teargas: false,
})

export function formatOfficerForRaport(o: any) {
    const position = (o.department || "").trim()
    const rank = (o.rank || "").trim()
    const fullName = [o.lastName, o.firstName].filter(Boolean).join(" ").trim()

    const header = [position, rank].filter(Boolean).join(", ")
    if (header && fullName) return `${header} — ${fullName}`
    return fullName || header
}

export function formatDateUa(isoDate: string) {
    const [year, month, day] = isoDate.split("-")
    if (!year || !month || !day) return isoDate
    return `${day}.${month}.${year}`
}

export function formatBirthDateUa(isoDate: string) {
    if (!isoDate) return ""
    return formatDateUa(isoDate)
}

export function formatTimeUa(hhmm: string) {
    if (!hhmm || !hhmm.includes(":")) return hhmm
    const [hh, mm] = hhmm.split(":")
    return `${hh} год. ${mm} хв.`
}

export function isTimeEarlier(left: string, right: string) {
    if (!left || !right) return false
    const [lh, lm] = left.split(":").map(Number)
    const [rh, rm] = right.split(":").map(Number)
    return lh * 60 + lm < rh * 60 + rm
}

export function addOneDay(isoDate: string) {
    const date = new Date(`${isoDate}T00:00:00`)
    if (Number.isNaN(date.getTime())) return isoDate
    date.setDate(date.getDate() + 1)
    return date.toISOString().slice(0, 10)
}

export function isApplicationLike(record: any) {
    return record.recordType === "APPLICATION" || record.recordType === "DETENTION_PROTOCOL"
}

export function getApplicationBirthDate(record: any) {
    const val = record?.address || ""
    if (typeof val !== "string") return "—"
    if (!val.startsWith("DOB:")) return "—"
    const iso = val.replace("DOB:", "")
    if (!iso) return "—"
    const [y, m, d] = iso.split("-")
    if (!y || !m || !d) return iso
    return `${d}.${m}.${y}`
}

export function getAssignedInspectorName(record: any) {
    if (!record.assignedUser) return "Не призначено"
    return `${record.assignedUser.lastName || ""} ${record.assignedUser.firstName || ""}`.trim() || record.assignedUser.username || "Призначено"
}
