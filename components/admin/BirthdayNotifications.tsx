'use client'

import { useEffect, useState } from 'react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { Cake, Loader2 } from 'lucide-react'
import { getOfficersWithBirthdays } from '@/app/admin/(protected)/officers/actions/birthdayActions'
import Image from 'next/image'
import Link from 'next/link'

interface BirthdayOfficer {
    id: string
    firstName: string
    lastName: string
    badgeNumber: string
    birthDate: Date | null
    imageUrl: string | null
    rank: string | null
    department: string | null
}

export default function BirthdayNotifications() {
    const [officers, setOfficers] = useState<BirthdayOfficer[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetchBirthdays = async () => {
            try {
                const data = await getOfficersWithBirthdays()
                // Convert string dates back to Date objects if needed (though Server Actions usually handle serialization)
                // Actually, over serialization Date might become string, let's be safe but data from server action is usually fine with modern Next.js
                setOfficers(data)
            } catch (error) {
                console.error("Failed to fetch birthdays", error)
            } finally {
                setLoading(false)
            }
        }

        fetchBirthdays()
    }, [])

    if (loading) return null
    if (officers.length === 0) return null

    return (
        <Popover>
            <PopoverTrigger asChild>
                <div className="relative cursor-pointer group">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="relative rounded-full hover:bg-pink-50 hover:text-pink-500 transition-colors w-10 h-10"
                    >
                        <Cake className="w-5 h-5" />
                        <span className="absolute top-2 right-2 w-2 h-2 bg-pink-500 rounded-full animate-pulse border border-white" />
                    </Button>
                </div>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0" align="end">
                <div className="p-4 border-b border-slate-100 bg-pink-50/50">
                    <div className="flex items-center gap-2">
                        <Cake className="w-4 h-4 text-pink-500" />
                        <h4 className="font-black text-sm uppercase tracking-wide text-slate-800">
                            Іменинники ({officers.length})
                        </h4>
                    </div>
                </div>
                <div className="max-h-[300px] overflow-y-auto p-2">
                    {officers.map((officer) => (
                        <Link
                            key={officer.id}
                            href={`/admin/officers/${officer.id}`}
                            className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded-xl transition-colors group"
                        >
                            <div className="w-10 h-10 rounded-full bg-slate-100 overflow-hidden relative border border-slate-200 shrink-0">
                                {officer.imageUrl ? (
                                    <Image
                                        src={officer.imageUrl}
                                        alt={`${officer.firstName} ${officer.lastName}`}
                                        fill
                                        className="object-cover"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-slate-400 font-bold text-xs">
                                        {officer.firstName[0]}{officer.lastName[0]}
                                    </div>
                                )}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-bold text-slate-900 truncate group-hover:text-primary transition-colors">
                                    {officer.lastName} {officer.firstName}
                                </p>
                                <div className="flex items-center gap-2 text-xs text-slate-500">
                                    <span className="font-mono bg-slate-100 px-1 rounded text-[10px]">{officer.badgeNumber}</span>
                                    {officer.rank && <span className="truncate">{officer.rank}</span>}
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            </PopoverContent>
        </Popover>
    )
}
