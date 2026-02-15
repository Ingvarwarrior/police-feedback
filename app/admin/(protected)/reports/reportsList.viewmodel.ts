import * as Papa from "papaparse"

type DateRangeLike = {
    from?: Date
    to?: Date
} | undefined

type ReportLike = {
    id: string
    createdAt: string | Date
    interactionDate?: string | Date | null
    interactionTime?: string | null
    districtOrCity?: string | null
    patrolRef?: string | null
    officerName?: string | null
    badgeNumber?: string | null
    incidentType?: string | null
    status: string
    rateOverall?: number | null
    ratePoliteness?: number | null
    rateProfessionalism?: number | null
    rateEffectiveness?: number | null
    wantContact?: boolean
    comment?: string | null
    internalNotes?: string | null
    assignedToId?: string | null
    contact?: {
        name?: string | null
        phone?: string | null
    } | null
    _count?: {
        attachments?: number
    }
}

type ProcessFilters = {
    mainTab: "all" | "active" | "processed"
    statusFilter: string
    quickFilter: string
    searchTerm: string
    sortBy: string
    dateRange: DateRangeLike
    executorFilter: string
}

export function maskSensitive(value: string | null | undefined, hasPerm: boolean) {
    if (!value) return "-"
    if (hasPerm) return value
    if (value.length <= 4) return "****"
    return value.slice(0, 3) + "***" + value.slice(-2)
}

export function getPriority(response: ReportLike): "urgent" | "important" | "standard" {
    if (response.rateOverall === 3 || response.wantContact) {
        return "important"
    }
    return "standard"
}

export function processReports(responses: ReportLike[], filters: ProcessFilters) {
    const {
        mainTab,
        statusFilter,
        quickFilter,
        searchTerm,
        sortBy,
        dateRange,
        executorFilter,
    } = filters

    let result = [...responses]

    if (mainTab === "active") {
        result = result.filter((r) => ["NEW", "ASSIGNED"].includes(r.status))
    } else if (mainTab === "processed") {
        result = result.filter((r) => ["RESOLVED", "ARCHIVED", "REVIEWED"].includes(r.status))
    }

    if (statusFilter !== "ALL") {
        result = result.filter((r) => r.status === statusFilter)
    }

    if (quickFilter === "URGENT") {
        result = result.filter((r) => getPriority(r) === "urgent")
    } else if (quickFilter === "WITH_PHOTO") {
        result = result.filter((r) => (r._count?.attachments || 0) > 0)
    } else if (quickFilter === "WITH_CONTACT") {
        result = result.filter((r) => !!r.wantContact)
    } else if (quickFilter === "TODAY") {
        const today = new Date().toDateString()
        result = result.filter((r) => new Date(r.createdAt).toDateString() === today)
    }

    if (executorFilter === "UNASSIGNED") {
        result = result.filter((r) => !r.assignedToId)
    } else if (executorFilter !== "ALL") {
        result = result.filter((r) => r.assignedToId === executorFilter)
    }

    if (dateRange?.from) {
        result = result.filter((r) => {
            const date = new Date(r.createdAt)
            const from = new Date(dateRange.from!)
            from.setHours(0, 0, 0, 0)

            if (dateRange.to) {
                const to = new Date(dateRange.to)
                to.setHours(23, 59, 59, 999)
                return date >= from && date <= to
            }

            const dayEnd = new Date(from)
            dayEnd.setHours(23, 59, 59, 999)
            return date >= from && date <= dayEnd
        })
    }

    if (searchTerm) {
        const term = searchTerm.toLowerCase()
        result = result.filter((r) =>
            (r.districtOrCity?.toLowerCase().includes(term)) ||
            (r.patrolRef?.toLowerCase().includes(term)) ||
            (r.internalNotes?.toLowerCase().includes(term)) ||
            (r.comment?.toLowerCase().includes(term))
        )
    }

    result.sort((a, b) => {
        if (sortBy === "newest") return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        if (sortBy === "oldest") return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        if (sortBy === "rating-high") return (b.rateOverall || 0) - (a.rateOverall || 0)
        if (sortBy === "rating-low") return (a.rateOverall || 0) - (b.rateOverall || 0)
        return 0
    })

    return result
}

export function buildReportsCsvString(items: ReportLike[], canViewSensitive: boolean) {
    const csvData = items.map((r) => ({
        "ID": r.id,
        "Дата створення": new Date(r.createdAt).toLocaleString("uk-UA"),
        "Час події": r.interactionDate
            ? new Date(r.interactionDate).toLocaleDateString("uk-UA") + (r.interactionTime ? ` (${r.interactionTime})` : "")
            : "-",
        "Локація": r.districtOrCity || "-",
        "Об'єкт": r.patrolRef || "-",
        "Офіцер": r.officerName ? `${r.officerName} (${r.badgeNumber || "-"})` : "-",
        "Тип події": r.incidentType || "-",
        "Статус": r.status === "NEW" ? "Новий" : r.status === "ASSIGNED" ? "В роботі" : r.status === "RESOLVED" ? "Вирішено" : "Архів",
        "Загальна оцінка": r.rateOverall,
        "Ввічливість": r.ratePoliteness || "-",
        "Професіоналізм": r.rateProfessionalism || "-",
        "Ефективність": r.rateEffectiveness || "-",
        "Є Контакт": r.wantContact ? "Так" : "Ні",
        "Ім'я контакту": maskSensitive(r.contact?.name, canViewSensitive),
        "Телефон": maskSensitive(r.contact?.phone, canViewSensitive),
        "Коментар": r.comment || "",
    }))

    return Papa.unparse(csvData)
}

