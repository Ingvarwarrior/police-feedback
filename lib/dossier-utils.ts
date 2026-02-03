import { Response, Officer } from "@prisma/client"

export type BehavioralTag = {
    id: string
    label: string
    color: string
    description: string
}

export type OfficerInteraction = {
    officerId: string
    badgeNumber: string
    name: string
    count: number
    avgScore: number
}

export function calculateCitizenTags(responses: any[]): BehavioralTag[] {
    const tags: BehavioralTag[] = []
    if (responses.length === 0) return tags

    // 1. Frequent Reporter
    if (responses.length >= 10) {
        tags.push({
            id: 'frequent',
            label: 'Постійний заявник',
            color: 'bg-blue-100 text-blue-700 border-blue-200',
            description: 'Подав 10 або більше звітів'
        })
    }

    // 2. Critical Reporter
    const avgScore = responses.reduce((acc, r) => acc + (r.rateOverall || 0), 0) / responses.length
    if (avgScore <= 2) {
        tags.push({
            id: 'critical_reporter',
            label: 'Критичний',
            color: 'bg-red-100 text-red-700 border-red-200',
            description: 'Середня оцінка 2.0 або нижче'
        })
    } else if (avgScore >= 4.5) {
        tags.push({
            id: 'constructive',
            label: 'Лояльний',
            color: 'bg-emerald-100 text-emerald-700 border-emerald-200',
            description: 'Зазвичай дає дуже високі оцінки'
        })
    }

    // 3. Night Owl (Majority of reports between 22:00 and 06:00)
    const nightReports = responses.filter(r => {
        const hour = new Date(r.createdAt).getHours()
        return hour >= 22 || hour <= 6
    })
    if (nightReports.length > responses.length / 2) {
        tags.push({
            id: 'night_owl',
            label: 'Нічний птах',
            color: 'bg-slate-800 text-white border-slate-900',
            description: 'Більшість звітів подано в нічний час'
        })
    }

    return tags
}

export function getOfficerInteractions(responses: any[]): OfficerInteraction[] {
    const interactions: Record<string, OfficerInteraction> = {}

    responses.forEach(resp => {
        const officers = resp.taggedOfficers || []
        officers.forEach((off: any) => {
            if (!interactions[off.id]) {
                interactions[off.id] = {
                    officerId: off.id,
                    badgeNumber: off.badgeNumber,
                    name: `${off.firstName} ${off.lastName}`,
                    count: 0,
                    avgScore: 0
                }
            }
            interactions[off.id].count++
            // Add score contribution for this interaction
            interactions[off.id].avgScore += (resp.rateOverall || 0)
        })
    })

    return Object.values(interactions)
        .map(i => ({
            ...i,
            avgScore: i.avgScore / i.count
        }))
        .sort((a, b) => b.count - a.count)
}
