'use client'

import React from 'react'
import Link from 'next/link'
import { ShieldCheck } from 'lucide-react'
import Image from 'next/image'

export default function SiteHeader() {
    return (
        <header className="fixed top-0 w-full bg-white/80 backdrop-blur-md border-b border-slate-200 z-50">
            <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
                <Link href="/" className="flex items-center gap-3 group">
                    <div className="group-hover:scale-105 transition-transform">
                        <Image src="/emblem.jpg" alt="Logo" width={48} height={60} className="w-12 h-auto" />
                    </div>
                    <span className="font-black text-slate-900 tracking-tight text-xl uppercase italic">
                        Патрульна поліція <br className="sm:hidden" /> Хмільницького району
                    </span>
                </Link>
            </div>
        </header>
    )
}
