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

export function isServiceInvestigationRecord(record: any) {
    return record.recordType === "SERVICE_INVESTIGATION"
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

export type NormalizedRecordType = "EO" | "ZVERN" | "APPLICATION" | "DETENTION_PROTOCOL" | "SERVICE_INVESTIGATION" | "OTHER"

export function normalizeRecordType(recordType?: string | null, eoNumber?: string | null): NormalizedRecordType {
    const raw = (recordType || "").trim().toUpperCase()
    if (raw === "EO" || raw === "ZVERN" || raw === "APPLICATION" || raw === "DETENTION_PROTOCOL" || raw === "SERVICE_INVESTIGATION") {
        return raw
    }

    const number = (eoNumber || "").trim().toUpperCase()
    if (number.startsWith("APP-")) return "APPLICATION"
    if (number.startsWith("DET-") || number.startsWith("DTP-")) return "DETENTION_PROTOCOL"
    if (number.startsWith("ZV-") || number.startsWith("ZVERN-")) return "ZVERN"
    if (number.length > 0) return "EO"
    return "OTHER"
}

export function getRecordTypeLabel(recordType?: string | null, eoNumber?: string | null) {
    const normalized = normalizeRecordType(recordType, eoNumber)
    if (normalized === "EO") return "ЄО"
    if (normalized === "ZVERN") return "Звернення"
    if (normalized === "APPLICATION") return "Застосування сили/спецзасобів"
    if (normalized === "DETENTION_PROTOCOL") return "Протоколи затримання"
    if (normalized === "SERVICE_INVESTIGATION") return "Службові розслідування"
    return "Інше"
}

export function formatDateTimeUa(value?: string | Date | null) {
    if (!value) return "—"
    const date = value instanceof Date ? value : new Date(value)
    if (Number.isNaN(date.getTime())) return "—"
    return date
        .toLocaleString("uk-UA", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
        })
        .replace(",", "")
}

export function getServiceInvestigationStageLabel(record: any) {
    const stage = String(record?.investigationStage || "REPORT_REVIEW")
    if (stage === "REPORT_REVIEW") return "Розгляд рапорту/доповідної"
    if (stage === "SR_INITIATED") return "Ініційовано СР"
    if (stage === "SR_ORDER_ASSIGNED") return "Призначено СР (наказ)"
    if (stage === "SR_COMPLETED_LAWFUL") return "СР завершено: дії правомірні"
    if (stage === "SR_COMPLETED_UNLAWFUL") return "СР завершено: дії неправомірні"
    if (stage === "CHECK_COMPLETED_NO_VIOLATION") return "Перевірку завершено: порушень не виявлено"
    return stage
}

export type ServiceInvestigationTimelineStatus = "done" | "current" | "pending" | "skipped"

export interface ServiceInvestigationTimelineItem {
    key: string
    label: string
    at: string | Date | null
    status: ServiceInvestigationTimelineStatus
    hint?: string
}

export interface ServiceInvestigationPenaltyEntry {
    officerId: string
    penaltyType: string
    penaltyOther?: string | null
}

export function parseServiceInvestigationPenaltyItems(raw: unknown): ServiceInvestigationPenaltyEntry[] {
    if (!raw) return []
    let parsed: unknown = raw

    if (typeof raw === "string") {
        try {
            parsed = JSON.parse(raw)
        } catch {
            return []
        }
    }

    if (!Array.isArray(parsed)) return []

    return parsed
        .map((item: any) => ({
            officerId: String(item?.officerId || "").trim(),
            penaltyType: String(item?.penaltyType || "").trim(),
            penaltyOther: typeof item?.penaltyOther === "string" ? item.penaltyOther.trim() : null,
        }))
        .filter((item) => item.officerId && item.penaltyType)
}

export function getServiceInvestigationPenaltyValue(entry: ServiceInvestigationPenaltyEntry) {
    const type = String(entry.penaltyType || "").trim()
    if (!type) return ""
    if (type.toLowerCase() === "інший варіант") {
        return String(entry.penaltyOther || "").trim() || type
    }
    return type
}

export function buildServiceInvestigationPenaltySummary(record: any, maxItems: number = 2) {
    const officers = Array.isArray(record?.officers) ? record.officers : []
    const penaltyItems = parseServiceInvestigationPenaltyItems(record?.investigationPenaltyItems)

    if (!penaltyItems.length) {
        if (!record?.investigationPenaltyType) return ""
        const fallbackType = String(record.investigationPenaltyType || "").trim()
        if (!fallbackType) return ""
        return fallbackType.toLowerCase() === "інший варіант"
            ? (String(record?.investigationPenaltyOther || "").trim() || fallbackType)
            : fallbackType
    }

    const chunks = penaltyItems.map((item) => {
        const officer = officers.find((o: any) => o.id === item.officerId)
        const officerLabel = officer
            ? `${officer.lastName || ""} ${officer.firstName || ""}`.trim() || officer.badgeNumber || item.officerId
            : item.officerId
        return `${officerLabel}: ${getServiceInvestigationPenaltyValue(item)}`
    })

    if (chunks.length <= maxItems) return chunks.join("; ")
    const visible = chunks.slice(0, maxItems).join("; ")
    return `${visible}; +${chunks.length - maxItems} ще`
}

const SERVICE_STAGE_ORDER: Record<string, number> = {
    REPORT_REVIEW: 1,
    SR_INITIATED: 2,
    SR_ORDER_ASSIGNED: 3,
    SR_COMPLETED_LAWFUL: 4,
    SR_COMPLETED_UNLAWFUL: 4,
    CHECK_COMPLETED_NO_VIOLATION: 4,
}

export function getServiceInvestigationTimeline(record: any): ServiceInvestigationTimelineItem[] {
    const stage = String(record?.investigationStage || "REPORT_REVIEW")
    const stageOrder = SERVICE_STAGE_ORDER[stage] || 1
    const noSrPath = stage === "CHECK_COMPLETED_NO_VIOLATION" || record?.investigationReviewResult === "NO_VIOLATION"

    const items: ServiceInvestigationTimelineItem[] = [
        {
            key: "registered",
            label: "Документ зареєстровано",
            at: record?.createdAt || record?.eoDate || null,
            status: "done",
        },
        {
            key: "review",
            label: "Розгляд рапорту/доповідної",
            at: record?.investigationReviewAt || null,
            status: record?.investigationReviewAt
                ? "done"
                : stage === "REPORT_REVIEW"
                    ? "current"
                    : "done",
        },
    ]

    if (noSrPath) {
        items.push(
            {
                key: "initiate",
                label: "Ініційовано СР",
                at: null,
                status: "skipped",
                hint: "СР не ініційовано",
            },
            {
                key: "order",
                label: "Призначено СР (наказ)",
                at: null,
                status: "skipped",
                hint: "Наказ не видавався",
            }
        )
    } else {
        items.push({
            key: "initiate",
            label: "Ініційовано СР",
            at: record?.investigationInitiatedAt || null,
            status: record?.investigationInitiatedAt
                ? "done"
                : stage === "SR_INITIATED"
                    ? "current"
                    : stageOrder > 2
                        ? "done"
                        : "pending",
        })

        const orderHintDate = record?.investigationOrderDate
            ? formatDateTimeUa(record.investigationOrderDate).split(" ")[0]
            : ""
        const orderHint = record?.investigationOrderNumber || record?.investigationOrderDate
            ? `Наказ №${record?.investigationOrderNumber || "—"}${orderHintDate ? ` від ${orderHintDate}` : ""}`
            : undefined

        items.push({
            key: "order",
            label: "Призначено СР (наказ)",
            at: record?.investigationOrderAssignedAt || null,
            status: record?.investigationOrderAssignedAt
                ? "done"
                : stage === "SR_ORDER_ASSIGNED"
                    ? "current"
                    : stageOrder > 3
                        ? "done"
                        : "pending",
            hint: orderHint,
        })
    }

    let finalLabel = "Завершення розгляду"
    if (stage === "CHECK_COMPLETED_NO_VIOLATION") {
        finalLabel = "Перевірку завершено: порушень не виявлено"
    } else if (stage === "SR_COMPLETED_UNLAWFUL" || record?.investigationFinalResult === "UNLAWFUL") {
        finalLabel = "СР завершено: дії неправомірні"
    } else if (stage === "SR_COMPLETED_LAWFUL" || record?.investigationFinalResult === "LAWFUL") {
        finalLabel = "СР завершено: дії правомірні"
    }

    const hintParts: string[] = []
    const penaltySummary = buildServiceInvestigationPenaltySummary(record, 1)
    if (penaltySummary) {
        hintParts.push(`Стягнення: ${penaltySummary}`)
    }
    if (record?.investigationConclusionApprovedAt) {
        const dateLabel = formatDateTimeUa(record.investigationConclusionApprovedAt).split(" ")[0]
        hintParts.push(`Висновок СР: ${dateLabel}`)
    }
    if (record?.investigationPenaltyByArticle13 && (record?.investigationPenaltyOrderNumber || record?.investigationPenaltyOrderDate)) {
        const orderDate = record?.investigationPenaltyOrderDate
            ? formatDateTimeUa(record.investigationPenaltyOrderDate).split(" ")[0]
            : ""
        hintParts.push(`Наказ про стягнення №${record?.investigationPenaltyOrderNumber || "—"}${orderDate ? ` від ${orderDate}` : ""}`)
    }
    const finalHint = hintParts.length > 0 ? hintParts.join(" • ") : undefined

    items.push({
        key: "final",
        label: finalLabel,
        at: record?.investigationCompletedAt || null,
        status: stageOrder >= 4 || record?.status === "PROCESSED" ? "done" : "pending",
        hint: finalHint,
    })

    return items
}
