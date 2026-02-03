// Text Analytics Utilities for AI-powered insights

export interface KeywordResult {
    word: string
    count: number
    sentiment?: 'positive' | 'negative' | 'neutral'
}

// Ukrainian stop words (common words to exclude from analysis)
const STOP_WORDS = new Set([
    'в', 'на', 'і', 'з', 'до', 'від', 'за', 'по', 'це', 'що', 'як', 'не', 'та', 'у',
    'він', 'вона', 'вони', 'який', 'була', 'був', 'були', 'буде', 'є', 'мене', 'мені',
    'для', 'або', 'але', 'ще', 'вже', 'дуже', 'так', 'все', 'всі', 'коли', 'де', 'чому',
    'той', 'той', 'та', 'тому', 'через', 'про', 'під', 'над', 'між', 'при', 'без'
])

// Negative sentiment keywords (Ukrainian)
const NEGATIVE_KEYWORDS = new Set([
    'грубість', 'грубий', 'грубо', 'хамство', 'хам', 'нахабний', 'агресія', 'агресивний',
    'вимагання', 'вимагає', 'корупція', 'хабар', 'неадекватний', 'неадекватність',
    'погрози', 'погрожує', 'лайка', 'кричить', 'кричав', 'образа', 'образливий',
    'черга', 'чекати', 'очікування', 'повільно', 'довго', 'втомився', 'втомлений',
    'ігнорує', 'ігнорування', 'байдужість', 'байдужий', 'некомпетентний', 'некомпетентність',
    'п\'яний', 'алкоголь', 'непрофесійний', 'безвідповідальний', 'безвідповідальність'
])

// Positive sentiment keywords (Ukrainian)
const POSITIVE_KEYWORDS = new Set([
    'дякую', 'вдячний', 'вдячність', 'вдячна', 'дякую', 'професіонал', 'професійний',
    'ввічливий', 'ввічливість', 'вихований', 'допоміг', 'допомога', 'допомогли',
    'швидко', 'швидкість', 'оперативно', 'оперативність', 'молодець', 'молодці',
    'відмінно', 'чудово', 'прекрасно', 'супер', 'розумний', 'розуміння', 'підтримка',
    'турбота', 'уважний', 'увага', 'компетентний', 'компетентність', 'знає', 'вміє'
])

/**
 * Extract keywords from text with frequency counting
 * Filters out stop words and focuses on meaningful words
 */
export function extractKeywords(texts: string[]): KeywordResult[] {
    const wordCounts = new Map<string, number>()

    texts.forEach(text => {
        if (!text) return

        // Normalize: lowercase, remove punctuation, split by spaces
        const words = text
            .toLowerCase()
            .replace(/[.,!?;:()"«»—–-]/g, ' ')
            .split(/\s+/)
            .filter(w => w.length > 2 && !STOP_WORDS.has(w))

        words.forEach(word => {
            wordCounts.set(word, (wordCounts.get(word) || 0) + 1)
        })
    })

    // Convert to array and sort by frequency
    const results: KeywordResult[] = Array.from(wordCounts.entries())
        .map(([word, count]) => ({
            word,
            count,
            sentiment: classifyWord(word)
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 50) // Top 50 keywords

    return results
}

/**
 * Classify a single word's sentiment
 */
function classifyWord(word: string): 'positive' | 'negative' | 'neutral' {
    if (NEGATIVE_KEYWORDS.has(word)) return 'negative'
    if (POSITIVE_KEYWORDS.has(word)) return 'positive'
    return 'neutral'
}

/**
 * Analyze sentiment of a full text
 * Returns overall sentiment based on keyword presence
 */
export function analyzeSentiment(text: string): 'positive' | 'neutral' | 'negative' | 'toxic' {
    if (!text) return 'neutral'

    const normalized = text.toLowerCase()
    let positiveScore = 0
    let negativeScore = 0

    // Count positive keywords
    POSITIVE_KEYWORDS.forEach(keyword => {
        if (normalized.includes(keyword)) positiveScore++
    })

    // Count negative keywords
    NEGATIVE_KEYWORDS.forEach(keyword => {
        if (normalized.includes(keyword)) negativeScore++
    })

    // Detect toxic patterns (excessive caps, multiple exclamation marks)
    const capsRatio = (text.match(/[А-ЯІЇЄҐ]/g) || []).length / text.length
    const exclamations = (text.match(/!/g) || []).length

    if (capsRatio > 0.5 || exclamations > 3) {
        return 'toxic'
    }

    if (negativeScore > positiveScore * 1.5) return 'negative'
    if (positiveScore > negativeScore * 1.5) return 'positive'
    return 'neutral'
}

/**
 * Calculate sentiment distribution for multiple texts
 */
export function getSentimentDistribution(texts: string[]) {
    const distribution = {
        positive: 0,
        neutral: 0,
        negative: 0,
        toxic: 0
    }

    texts.forEach(text => {
        const sentiment = analyzeSentiment(text)
        distribution[sentiment]++
    })

    return distribution
}
