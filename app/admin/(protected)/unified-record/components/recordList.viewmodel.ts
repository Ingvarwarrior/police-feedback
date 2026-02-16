import { format } from "date-fns"
import { uk } from "date-fns/locale"
import { normalizeRecordType } from "./unifiedRecord.helpers"

type QuickPreset = "ALL" | "MINE" | "OVERDUE" | "UNASSIGNED"

type RecordFilters = {
    activeTab: string
    filterSearch: string
    filterCategory: string
    filterStatus: string
    filterAssignment: string
    filterEoNumber: string
    filterInspector: string
    sortBy: string
    quickPreset: QuickPreset
    periodFrom: string
    periodTo: string
    currentUserId: string
}

export function normalizeInitialRecords(records: any[]): any[] {
    return records
        .filter((r) => r.recordType !== "RAPORT")
        .map((r) => ({ ...r, recordType: normalizeRecordType(r.recordType, r.eoNumber || undefined) }))
}

export function filterUnifiedRecords(records: any[], filters: RecordFilters): any[] {
    const {
        activeTab,
        filterSearch,
        filterCategory,
        filterStatus,
        filterAssignment,
        filterEoNumber,
        filterInspector,
        sortBy,
        quickPreset,
        periodFrom,
        periodTo,
        currentUserId,
    } = filters

    let result = [...records]

    if (activeTab !== "ALL") {
        result = result.filter((r) => r.recordType === activeTab)
    }

    if (filterSearch.trim()) {
        const lowerSearch = filterSearch.trim().toLowerCase()
        result = result.filter((r) =>
            (r.eoNumber && String(r.eoNumber).toLowerCase().includes(lowerSearch)) ||
            (r.description?.toLowerCase().includes(lowerSearch)) ||
            (r.address?.toLowerCase().includes(lowerSearch)) ||
            (r.applicant?.toLowerCase().includes(lowerSearch)) ||
            (r.officers?.some((o: any) =>
                o.lastName?.toLowerCase().includes(lowerSearch) ||
                o.firstName?.toLowerCase().includes(lowerSearch)
            ))
        )
    }

    if (filterCategory !== "ALL") {
        result = result.filter((r) => r.category === filterCategory)
    }

    if (filterStatus === "PENDING") {
        result = result.filter((r) => r.status !== "PROCESSED")
    } else if (filterStatus === "PROCESSED") {
        result = result.filter((r) => r.status === "PROCESSED")
    }

    if (filterAssignment === "ASSIGNED") {
        result = result.filter((r) => r.assignedUserId !== null)
    } else if (filterAssignment === "UNASSIGNED") {
        result = result.filter((r) => r.assignedUserId === null)
    }

    if (filterEoNumber.trim()) {
        const lowerEo = filterEoNumber.trim().toLowerCase()
        result = result.filter((r) => r.eoNumber && String(r.eoNumber).toLowerCase().includes(lowerEo))
    }

    if (filterInspector !== "ALL") {
        result = result.filter((r) => r.assignedUserId === filterInspector)
    }

    if (quickPreset === "MINE") {
        result = result.filter((r) => r.assignedUserId === currentUserId)
    }

    if (quickPreset === "UNASSIGNED") {
        result = result.filter((r) => r.assignedUserId === null)
    }

    if (quickPreset === "OVERDUE") {
        const now = new Date()
        result = result.filter((r) => r.status !== "PROCESSED" && r.deadline && new Date(r.deadline) < now)
    }

    if (periodFrom) {
        const from = new Date(periodFrom)
        from.setHours(0, 0, 0, 0)
        result = result.filter((r) => r.eoDate && new Date(r.eoDate) >= from)
    }

    if (periodTo) {
        const to = new Date(periodTo)
        to.setHours(23, 59, 59, 999)
        result = result.filter((r) => r.eoDate && new Date(r.eoDate) <= to)
    }

    result.sort((a, b) => {
        if (sortBy === "registration_newest") {
            return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
        }
        if (sortBy === "registration_oldest") {
            return new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime()
        }

        if (sortBy === "newest") return new Date(b.eoDate || 0).getTime() - new Date(a.eoDate || 0).getTime()
        if (sortBy === "oldest") return new Date(a.eoDate || 0).getTime() - new Date(b.eoDate || 0).getTime()

        if (sortBy === "eo_asc" || sortBy === "eo_desc") {
            const valA = String(a.eoNumber || "")
            const valB = String(b.eoNumber || "")
            const cmp = valA.localeCompare(valB, undefined, { numeric: true, sensitivity: "base" })
            return sortBy === "eo_asc" ? cmp : -cmp
        }

        return 0
    })

    return result
}

export function getRecordCategories(records: any[]): string[] {
    const cats = new Set(records.map((r) => r.category).filter(Boolean))
    return Array.from(cats) as string[]
}

export function getOverdueRecords(records: any[], nowTs: number): any[] {
    const now = new Date(nowTs)
    return records
        .filter((r) => r.status !== "PROCESSED" && r.deadline && new Date(r.deadline) < now)
        .sort((a, b) => new Date(a.deadline || 0).getTime() - new Date(b.deadline || 0).getTime())
}

export function getDueSoonRecords(records: any[], nowTs: number): any[] {
    const in24h = nowTs + 24 * 60 * 60 * 1000
    return records
        .filter((r) => {
            if (r.status === "PROCESSED" || !r.deadline) return false
            const deadlineTs = new Date(r.deadline).getTime()
            return deadlineTs >= nowTs && deadlineTs <= in24h
        })
        .sort((a, b) => new Date(a.deadline || 0).getTime() - new Date(b.deadline || 0).getTime())
}

export function buildRecordExportData(records: any[]): any[] {
    return records.map((r) => ({
        "Дата звернення": format(new Date(r.eoDate || new Date()), "dd.MM.yyyy", { locale: uk }),
        "№ ЄО/Звернення": r.eoNumber || "-",
        "Заявник": r.applicant || "-",
        "Виконавець": r.assignedUser
            ? `${r.assignedUser.lastName || ""} ${r.assignedUser.firstName || ""}`.trim()
            : r.assignedUserId === "unassigned"
                ? "Не призначено"
                : "—",
        "Тип": r.recordType || "-",
        "Категорія": r.category || "-",
        "Статус": r.status === "PROCESSED" ? "Опрацьовано" : "В роботі",
        "Рішення": r.resolution || "-",
    }))
}
