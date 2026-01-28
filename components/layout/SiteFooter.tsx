'use client'

import React from 'react'
import Link from 'next/link'
import { ShieldCheck } from 'lucide-react'

export default function SiteFooter() {
    return (
        <footer className="bg-slate-50 border-t border-slate-200 py-12">
            <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-8">
                <div className="space-y-2 text-center md:text-left">
                    <div className="flex items-center justify-center md:justify-start gap-2 font-black text-slate-900 tracking-tighter uppercase italic">
                        <ShieldCheck className="w-5 h-5 text-primary" />
                        Патрульна поліція Хмільницького району
                    </div>
                    <p className="text-sm text-slate-500">Система збору відгуків громади Хмільницького району.</p>
                </div>
                <div className="flex gap-8 text-sm font-bold text-slate-400 uppercase tracking-widest">
                    <Link href="/privacy" className="hover:text-primary transition-colors">Політика</Link>
                    <Link href="/terms" className="hover:text-primary transition-colors">Правила</Link>
                    <Link href="/contacts" className="hover:text-primary transition-colors">Контакти</Link>
                </div>
                <div className="text-xs text-slate-400 font-medium">
                    © 2026 Патрульна поліція України
                </div>
            </div>
        </footer>
    )
}
