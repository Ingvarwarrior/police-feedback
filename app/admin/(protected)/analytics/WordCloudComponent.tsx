'use client'

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertTriangle } from "lucide-react"
import { cn } from "@/lib/utils"

interface KeywordResult {
    word: string
    count: number
    sentiment?: 'positive' | 'negative' | 'neutral'
}

interface WordCloudProps {
    keywords: KeywordResult[]
    title?: string
}

export default function WordCloudComponent({ keywords, title = "Хмара ключових слів" }: WordCloudProps) {
    if (!keywords || keywords.length === 0) {
        return (
            <Card className="border-0 shadow-lg shadow-slate-200/50 rounded-[2rem]">
                <CardHeader className="p-8">
                    <CardTitle className="text-sm font-black uppercase tracking-widest">
                        {title}
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-8 text-center text-slate-400">
                    Недостатньо даних для аналізу
                </CardContent>
            </Card>
        )
    }

    const maxCount = Math.max(...keywords.map(k => k.count))
    const minCount = Math.min(...keywords.map(k => k.count))

    // Calculate font size based on frequency
    const getFontSize = (count: number) => {
        const normalized = (count - minCount) / (maxCount - minCount || 1)
        return 12 + normalized * 28 // 12px to 40px
    }

    const getColor = (sentiment?: string) => {
        switch (sentiment) {
            case 'negative': return 'text-rose-600'
            case 'positive': return 'text-emerald-600'
            default: return 'text-slate-600'
        }
    }

    return (
        <Card className="border-0 shadow-lg shadow-slate-200/50 rounded-[2rem]">
            <CardHeader className="p-8 pb-0">
                <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-rose-500" />
                    {title}
                </CardTitle>
                <p className="text-[10px] text-slate-400 mt-2 uppercase font-bold tracking-widest">
                    Найчастіші слова в негативних відгуках
                </p>
            </CardHeader>
            <CardContent className="p-8">
                <div className="flex flex-wrap gap-3 justify-center items-center min-h-[300px]">
                    {keywords.slice(0, 40).map((kw, idx) => (
                        <span
                            key={idx}
                            className={cn(
                                "font-black transition-all hover:scale-110 cursor-default inline-block",
                                getColor(kw.sentiment)
                            )}
                            style={{
                                fontSize: `${getFontSize(kw.count)}px`,
                                opacity: 0.6 + (kw.count / maxCount) * 0.4
                            }}
                            title={`${kw.word}: ${kw.count} разів`}
                        >
                            {kw.word}
                        </span>
                    ))}
                </div>
            </CardContent>
        </Card>
    )
}
