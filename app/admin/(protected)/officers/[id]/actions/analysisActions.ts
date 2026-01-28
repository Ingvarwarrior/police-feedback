'use server'

import { prisma } from "@/lib/prisma"

const KEYWORDS = {
    PROFESSIONALISM: ['професійн', 'грамотн', 'чітк', 'знає', 'закон', 'справ'],
    COMMUNICATION: ['ввічлив', 'культ', 'вихован', 'спокійн', 'приємн', 'слуха'],
    ETHICS: ['чесн', 'справедлив', 'людян', 'допомо'],
    CRITICISM: ['груб', 'нецензурн', 'хам', 'ігнор', 'повільн', 'некомпетент']
}

export async function analyzeOfficerFeedback(officerId: string) {
    const feedback = await prisma.response.findMany({
        where: { officerId },
        select: { comment: true, rateOverall: true }
    })

    if (feedback.length === 0) return null

    const stats = {
        sentiment: { positive: 0, neutral: 0, negative: 0 },
        topics: {
            professionalism: 0,
            communication: 0,
            ethics: 0,
            criticism: 0
        },
        strengths: [] as string[],
        weaknesses: [] as string[]
    }

    feedback.forEach(fb => {
        // Sentiment
        const rating = fb.rateOverall ?? 0
        if (rating >= 4) stats.sentiment.positive++
        else if (rating >= 3) stats.sentiment.neutral++
        else stats.sentiment.negative++

        const comment = fb.comment?.toLowerCase() || ''

        // Topic detection
        if (KEYWORDS.PROFESSIONALISM.some(k => comment.includes(k))) stats.topics.professionalism++
        if (KEYWORDS.COMMUNICATION.some(k => comment.includes(k))) stats.topics.communication++
        if (KEYWORDS.ETHICS.some(k => comment.includes(k))) stats.topics.ethics++
        if (KEYWORDS.CRITICISM.some(k => comment.includes(k))) stats.topics.criticism++
    })

    // Extract top topics as strengths/weaknesses
    if (stats.topics.professionalism > feedback.length / 3) stats.strengths.push("Високий рівень професіоналізму")
    if (stats.topics.communication > feedback.length / 3) stats.strengths.push("Ввічлива комунікація з громадянами")
    if (stats.topics.ethics > feedback.length / 3) stats.strengths.push("Справедливість та людяність")

    if (stats.topics.criticism > feedback.length / 5) stats.weaknesses.push("Скарги на манеру спілкування або швидкість")

    return stats
}
