'use client'

import React from 'react'
import SiteHeader from '@/components/layout/SiteHeader'
import SiteFooter from '@/components/layout/SiteFooter'

export default function StaticPageLayout({
    title,
    children
}: {
    title: string,
    children: React.ReactNode
}) {
    return (
        <div className="flex flex-col min-h-screen bg-slate-50">
            <SiteHeader />
            <main className="flex-1 pt-32 pb-24 px-4">
                <div className="max-w-4xl mx-auto">
                    <h1 className="text-4xl font-black text-slate-900 mb-12 tracking-tight uppercase italic">{title}</h1>
                    <div className="prose prose-slate prose-lg max-w-none bg-white p-8 sm:p-12 rounded-[3.5rem] shadow-sm border border-slate-100 italic font-medium text-slate-600 leading-relaxed">
                        {children}
                    </div>
                </div>
            </main>
            <SiteFooter />
        </div>
    )
}
