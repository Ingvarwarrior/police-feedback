import {
    addOneDay,
    forceLabels,
    formatBirthDateUa,
    formatDateUa,
    formatTimeUa,
    isTimeEarlier,
    type ForceKey,
    type ForceUsage,
    type LegalBasisState,
} from "./unifiedRecord.helpers"

export const DEFAULT_DETENTION_PURPOSE = "для припинення адміністративного правопорушення оформлення адміністративних матеріалів"
export const DEFAULT_DETENTION_MATERIALS = "Складено постанову/протокол"

type ForceDescriptionResult = {
    description: string
    error?: string
}

export function buildRaportForceDescription(forceUsage: ForceUsage): ForceDescriptionResult {
    const activeKeys = (Object.keys(forceUsage) as ForceKey[]).filter((k) => forceUsage[k].enabled)
    if (activeKeys.length === 0) {
        return { description: "", error: "Оберіть щонайменше один засіб застосування" }
    }

    const lines: string[] = []
    for (const key of activeKeys) {
        const item = forceUsage[key]
        const label = forceLabels[key]

        if (!item.date) {
            return { description: "", error: `Для "${label}" потрібно вказати дату` }
        }

        if (key === "handcuffs") {
            if (!item.from || !item.to) {
                return { description: "", error: `Для "${label}" потрібно вказати період часу з-по` }
            }
            const endDate = isTimeEarlier(item.to, item.from) ? addOneDay(item.date) : item.date
            lines.push(`${label.toLowerCase()} — з ${item.from} ${formatDateUa(item.date)} по ${item.to} ${formatDateUa(endDate)}`)
        } else {
            if (!item.time) {
                return { description: "", error: `Для "${label}" потрібно вказати час` }
            }
            lines.push(`${label.toLowerCase()} — ${formatDateUa(item.date)} о ${item.time}`)
        }
    }

    return { description: lines.join("; ") }
}

export function buildRaportLegalAddress(
    legalBasis: LegalBasisState,
    subjectFullName: string,
    subjectBirthDate: string
) {
    const parts: string[] = []

    if (legalBasis.art44_p1_force) {
        parts.push('Відповідно до частини 1 статті 44 ЗУ "Про Національну поліцію" - застосовано фізичну силу')
    }

    if (legalBasis.art45_p1_a_handcuffs) parts.push('відповідно до ч.3 п.1 пп.а) ст. 45 ЗУ "Про Національну поліцію" - застосовані кайданки')
    if (legalBasis.art45_p1_b_handcuffs) parts.push('відповідно до ч.3 п.1 пп.б) ст. 45 ЗУ "Про Національну поліцію" - застосовані кайданки')
    if (legalBasis.art45_p1_v_handcuffs) parts.push('відповідно до ч.3 п.1 пп.в) ст. 45 ЗУ "Про Національну поліцію" - застосовані кайданки')
    if (legalBasis.art45_p1_g_handcuffs) parts.push('відповідно до ч.3 п.1 пп.г) ст. 45 ЗУ "Про Національну поліцію" - застосовані кайданки')
    if (legalBasis.art45_p1_gg_handcuffs) parts.push('відповідно до ч.3 п.1 пп.ґ) ст. 45 ЗУ "Про Національну поліцію" - застосовані кайданки')

    if (legalBasis.art45_p2_a_baton) parts.push('відповідно до ч.3 п.2 пп.а) ст. 45 ЗУ "Про Національну поліцію" - застосовано гумовий кийок')
    if (legalBasis.art45_p2_b_baton) parts.push('відповідно до ч.3 п.2 пп.б) ст. 45 ЗУ "Про Національну поліцію" - застосовано гумовий кийок')
    if (legalBasis.art45_p2_v_baton) parts.push('відповідно до ч.3 п.2 пп.в) ст. 45 ЗУ "Про Національну поліцію" - застосовано гумовий кийок')

    if (legalBasis.art45_p3_a_teargas) parts.push('відповідно до ч.3 п.3 пп.а) ст. 45 ЗУ "Про Національну поліцію" - застосовані засоби сльозогінної та дратівної дії')
    if (legalBasis.art45_p3_b_teargas) parts.push('відповідно до ч.3 п.3 пп.б) ст. 45 ЗУ "Про Національну поліцію" - застосовані засоби сльозогінної та дратівної дії')

    const subject = [subjectFullName.trim(), subjectBirthDate ? `${formatBirthDateUa(subjectBirthDate)} р.н.` : ""]
        .filter(Boolean)
        .join(" ")

    if (parts.length === 0) return ""
    return `${parts.join(" та ")}${subject ? ` до ${subject}.` : "."}`
}

type ProtocolSummaryArgs = {
    protocolPrepared: "YES" | "NO" | ""
    protocolNoReason: string
    protocolSeries: string
    protocolNumber: string
    detentionFromDate: string
    detentionFromTime: string
    detentionToDate: string
    detentionToTime: string
    detentionPurpose: string
    detentionMaterials: string
}

export function buildProtocolSummary(args: ProtocolSummaryArgs) {
    if (args.protocolPrepared === "NO") {
        return `Не складався. Причина: ${args.protocolNoReason.trim() || "не вказано"}.`
    }

    if (args.protocolPrepared === "YES") {
        return `Складався, відповідно до статей 261, 262, 263 КУпАП, затриманий з ${formatTimeUa(args.detentionFromTime)} ${formatDateUa(args.detentionFromDate)} р. до ${formatTimeUa(args.detentionToTime)} ${formatDateUa(args.detentionToDate)} р., ${args.detentionPurpose.trim()}. ${args.detentionMaterials.trim() || DEFAULT_DETENTION_MATERIALS} серії ${args.protocolSeries || "___"} номер ${args.protocolNumber || "___"}`
    }

    return ""
}

export function parseDetentionProtocolValue(value: string) {
    const match = value.match(/^Серія\s+(.+?)\s+№\s*(.+)$/i)
    if (!match) return { series: "", number: "" }
    return {
        series: match[1] || "",
        number: match[2] || "",
    }
}

