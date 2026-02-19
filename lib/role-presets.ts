import { PERMISSIONS_CONFIG, type PermissionId } from "@/lib/permissions-config"

export type RolePreset = {
    id: string
    title: string
    shortDesc: string
    fullDesc: string
    roleValue: "ADMIN" | "VIEWER"
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
        id: "VIEW_ONLY",
        title: "Перегляд",
        shortDesc: "Тільки перегляд без редагування",
        fullDesc: "Може переглядати реєстри, карти та базову аналітику без змін даних.",
        roleValue: "VIEWER",
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
        roleValue: "VIEWER",
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

    const enabled = new Set<PermissionId>()
    PERMISSIONS_CONFIG.forEach((perm) => {
        if (userLike[perm.id]) enabled.add(perm.id)
    })

    const candidates = ROLE_PRESETS.filter((preset) => preset.id !== "ADMIN")

    for (const preset of candidates) {
        const presetSet = new Set<PermissionId>(preset.enabledPermissions)
        if (enabled.size !== presetSet.size) {
            continue
        }
        const isExactMatch = [...enabled].every((perm) => presetSet.has(perm))
        if (isExactMatch) {
            return preset.id
        }
    }

    return "CUSTOM"
}

export function getRoleTitleByPermissions(userLike: Partial<Record<PermissionId, boolean>> & { role?: string | null }) {
    const presetId = detectPresetIdByPermissions(userLike)
    const preset = getRolePresetById(presetId)
    if (preset) return preset.title
    if (userLike.role === "OFFICER_VIEWER") return "Перегляд"
    return userLike.role || "Користувач"
}
