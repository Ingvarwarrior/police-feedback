// Time Analytics Utilities for temporal pattern analysis

export interface HourlyDistribution {
    hour: number
    count: number
    avgRating: number
    negativeCount: number
}

export interface BurnoutAlert {
    officerId: string
    officerName: string
    currentRating: number
    trend: 'declining' | 'stable' | 'improving'
    last30Days: number
    last60Days: number
    last90Days: number
    alertLevel: 'none' | 'warning' | 'critical'
}

/**
 * Analyze hourly distribution of responses
 * Shows when negative feedback is most common
 */
export function getHourlyDistribution(responses: any[]): HourlyDistribution[] {
    const hourlyData = new Map<number, { total: number, ratingSum: number, negativeCount: number }>()

    // Initialize all 24 hours
    for (let h = 0; h < 24; h++) {
        hourlyData.set(h, { total: 0, ratingSum: 0, negativeCount: 0 })
    }

    responses.forEach(r => {
        if (!r.rateOverall || r.rateOverall === 0) return // Skip unrated

        const hour = new Date(r.createdAt).getHours()
        const data = hourlyData.get(hour)!

        data.total++
        data.ratingSum += r.rateOverall
        if (r.rateOverall < 3) data.negativeCount++
    })

    return Array.from(hourlyData.entries()).map(([hour, data]) => ({
        hour,
        count: data.total,
        avgRating: data.total > 0 ? data.ratingSum / data.total : 0,
        negativeCount: data.negativeCount
    }))
}

/**
 * Detect burnout trends for officers
 * Compares ratings across 30/60/90 day windows
 */
export function detectBurnout(
    officerId: string,
    officerName: string,
    responses: any[]
): BurnoutAlert | null {
    const now = new Date()
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000)
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)

    // Filter officer responses with ratings > 0
    const officerResponses = responses.filter(r =>
        r.officerId === officerId && r.rateOverall && r.rateOverall > 0
    )

    if (officerResponses.length < 5) return null // Not enough data

    const calculateAvg = (startDate: Date) => {
        const filtered = officerResponses.filter(r => new Date(r.createdAt) >= startDate)
        if (filtered.length === 0) return 0
        return filtered.reduce((sum, r) => sum + r.rateOverall, 0) / filtered.length
    }

    const last30 = calculateAvg(thirtyDaysAgo)
    const last60 = calculateAvg(sixtyDaysAgo)
    const last90 = calculateAvg(ninetyDaysAgo)

    // Determine trend
    let trend: 'declining' | 'stable' | 'improving' = 'stable'
    let alertLevel: 'none' | 'warning' | 'critical' = 'none'

    const decline30to60 = last60 - last30
    const decline60to90 = last90 - last60

    if (decline30to60 > 0.3 && decline60to90 > 0.3) {
        trend = 'declining'
        alertLevel = last30 < 3 ? 'critical' : 'warning'
    } else if (decline30to60 < -0.3 && decline60to90 < -0.3) {
        trend = 'improving'
    }

    return {
        officerId,
        officerName,
        currentRating: last30,
        trend,
        last30Days: last30,
        last60Days: last60,
        last90Days: last90,
        alertLevel
    }
}

/**
 * Get day-of-week distribution
 */
export function getDayOfWeekDistribution(responses: any[]) {
    const days = ['Нд', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб']
    const distribution = days.map((day, idx) => ({
        day,
        dayIndex: idx,
        count: 0,
        avgRating: 0,
        ratingSum: 0
    }))

    responses.forEach(r => {
        if (!r.rateOverall || r.rateOverall === 0) return

        const dayIndex = new Date(r.createdAt).getDay()
        distribution[dayIndex].count++
        distribution[dayIndex].ratingSum += r.rateOverall
    })

    return distribution.map(d => ({
        ...d,
        avgRating: d.count > 0 ? d.ratingSum / d.count : 0
    }))
}
