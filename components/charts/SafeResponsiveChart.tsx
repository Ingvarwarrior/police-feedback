'use client'

import { useEffect, useRef, useState } from 'react'
import { ResponsiveContainer } from 'recharts'

interface SafeResponsiveChartProps {
    children: React.ReactNode
    minHeight?: number
    className?: string
}

export function SafeResponsiveChart({
    children,
    minHeight = 200,
    className = 'h-full w-full min-w-0',
}: SafeResponsiveChartProps) {
    const containerRef = useRef<HTMLDivElement | null>(null)
    const [ready, setReady] = useState(false)

    useEffect(() => {
        const element = containerRef.current
        if (!element) return

        const updateSize = () => {
            const rect = element.getBoundingClientRect()
            setReady(rect.width > 24 && rect.height > 24)
        }

        updateSize()

        const observer = new ResizeObserver(() => updateSize())
        observer.observe(element)

        window.addEventListener('resize', updateSize)
        window.addEventListener('pageshow', updateSize)

        return () => {
            observer.disconnect()
            window.removeEventListener('resize', updateSize)
            window.removeEventListener('pageshow', updateSize)
        }
    }, [])

    return (
        <div
            ref={containerRef}
            className={className}
            style={{ minHeight }}
        >
            {ready ? (
                <ResponsiveContainer width="100%" height="100%">
                    {children}
                </ResponsiveContainer>
            ) : null}
        </div>
    )
}
