import { PERMISSIONS_CONFIG, type PermissionId } from "@/lib/permissions-config"

export type RolePreset = {
    id: string
    title: string
    shortDesc: string
    fullDesc: string
    roleValue: "ADMIN" | "OFFICER_VIEWER" | "VIEWER"
    enabledPermissions: PermissionId[]
}

function allPermissions(): PermissionId[] {
    return PERMISSIONS_CONFIG.map((p) => p.id)
}

export const ROLE_PRESETS: RolePreset[] = [
    {
        id: "INSPECTOR",
        title: "Інспектор",
        shortDesc: "Опрацювання звернень і призначених кейсів",
        fullDesc: "Працює зі зверненнями, ЄО, картками громадян і базовою аналітикою без адмін-функцій.",
        roleValue: "VIEWER",
        enabledPermissions: [
            "permViewReports",
            "permViewSensitiveData",
            "permEditNotes",
            "permChangeStatus",
            "permViewOfficerStats",
            "permCreateEvaluations",
            "permViewUnifiedRecords",
            "permProcessUnifiedRecords",
            "permEditCitizens",
            "permMarkSuspicious",
            "permViewMap",
        ],
    },
    {
        id: "SUPERVISOR",
        title: "Керівник зміни",
        shortDesc: "Координація, розподіл і контроль строків",
        fullDesc: "Додатково до інспектора: призначає виконавців, робить масові дії, керує строками та має доступ до аудиту.",
        roleValue: "VIEWER",
        enabledPermissions: [
            "permViewReports",
            "permAssignReports",
            "permViewSensitiveData",
            "permBulkActionReports",
            "permEditNotes",
            "permChangeStatus",
            "permExportData",
            "permViewOfficerStats",
            "permCreateEvaluations",
            "permManageOfficerStatus",
            "permViewUnifiedRecords",
            "permManageUnifiedRecords",
            "permProcessUnifiedRecords",
            "permAssignUnifiedRecords",
            "permManageExtensions",
            "permImportUnifiedRecords",
            "permUseAiExtraction",
            "permReturnUnifiedRecords",
            "permEditCitizens",
            "permMarkSuspicious",
            "permViewMap",
            "permViewAnalytics",
            "permViewUsers",
            "permViewAudit",
            "permManageMailAlerts",
        ],
    },
    {
        id: "VIEW_ONLY",
        title: "Перегляд",
        shortDesc: "Тільки перегляд без редагування",
        fullDesc: "Може переглядати реєстри, карти та базову аналітику без змін даних.",
        roleValue: "OFFICER_VIEWER",
        enabledPermissions: [
            "permViewReports",
            "permViewUnifiedRecords",
            "permViewOfficerStats",
            "permViewAnalytics",
            "permViewMap",
        ],
    },
    {
        id: "HR",
        title: "Кадри",
        shortDesc: "Особовий склад і службові оцінки",
        fullDesc: "Веде облік особового складу: створення, редагування, оцінювання та статуси офіцерів.",
        roleValue: "OFFICER_VIEWER",
        enabledPermissions: [
            "permCreateOfficers",
            "permEditOfficers",
            "permViewOfficerStats",
            "permCreateEvaluations",
            "permManageOfficerStatus",
            "permViewUnifiedRecords",
        ],
    },
    {
        id: "AUDITOR",
        title: "Аудитор",
        shortDesc: "Тільки перегляд і звітність",
        fullDesc: "Без редагування даних: перегляд звернень, ЄО, аналітики, аудиту та експорт.",
        roleValue: "VIEWER",
        enabledPermissions: [
            "permViewReports",
            "permViewSensitiveData",
            "permExportData",
            "permViewUnifiedRecords",
            "permViewOfficerStats",
            "permViewAnalytics",
            "permViewMap",
            "permViewAudit",
        ],
    },
    {
        id: "EO_OPERATOR",
        title: "Оператор ЄО",
        shortDesc: "Реєстр ЄО та звернення",
        fullDesc: "Працює тільки з ЄО: створення, призначення, опрацювання і контроль подовжень.",
        roleValue: "VIEWER",
        enabledPermissions: [
            "permViewUnifiedRecords",
            "permManageUnifiedRecords",
            "permAssignUnifiedRecords",
            "permProcessUnifiedRecords",
            "permManageExtensions",
            "permImportUnifiedRecords",
            "permUseAiExtraction",
        ],
    },
    {
        id: "ADMIN",
        title: "Адміністратор",
        shortDesc: "Повний контроль системи",
        fullDesc: "Керує користувачами, довідниками, налаштуваннями і має повний доступ до всіх модулів.",
        roleValue: "ADMIN",
        enabledPermissions: allPermissions(),
    },
]

export function buildPermissionsMap(enabledPermissions: PermissionId[]) {
    const map: Record<string, boolean> = {}
    PERMISSIONS_CONFIG.forEach((p) => {
        map[p.id] = enabledPermissions.includes(p.id)
    })
    return map
}

export function getRolePresetById(id: string) {
    return ROLE_PRESETS.find((preset) => preset.id === id)
}

export function detectPresetIdByPermissions(userLike: Partial<Record<PermissionId, boolean>> & { role?: string | null }) {
    if (userLike.role === "ADMIN") return "ADMIN"
    if (userLike.role === "OFFICER_VIEWER") return "VIEW_ONLY"

    const enabled = new Set<PermissionId>()
    PERMISSIONS_CONFIG.forEach((perm) => {
        if (userLike[perm.id]) enabled.add(perm.id)
    })

    const candidates = ROLE_PRESETS.filter((preset) => preset.id !== "ADMIN")
    let bestPreset: RolePreset | null = null
    let bestScore = -1

    for (const preset of candidates) {
        const presetSet = new Set<PermissionId>(preset.enabledPermissions)
        const intersection = preset.enabledPermissions.filter((perm) => enabled.has(perm)).length
        const union = new Set<PermissionId>([...enabled, ...presetSet]).size || 1
        const score = intersection / union

        if (score > bestScore) {
            bestScore = score
            bestPreset = preset
        }
    }

    return bestPreset && bestScore > 0 ? bestPreset.id : "CUSTOM"
}

export function getRoleTitleByPermissions(userLike: Partial<Record<PermissionId, boolean>> & { role?: string | null }) {
    const presetId = detectPresetIdByPermissions(userLike)
    const preset = getRolePresetById(presetId)
    if (preset) return preset.title
    return userLike.role || "Користувач"
}
