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
    const [data, setData] = useState<{ today: BirthdayOfficer[], tomorrow: BirthdayOfficer[] }>({ today: [], tomorrow: [] })
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetchBirthdays = async () => {
            try {
                const result = await getOfficersWithBirthdays()
                setData(result)
            } catch (error) {
                console.error("Failed to fetch birthdays", error)
            } finally {
                setLoading(false)
            }
        }

        fetchBirthdays()
    }, [])

    const hasToday = data.today.length > 0
    const hasTomorrow = data.tomorrow.length > 0
    const hasBirthdays = hasToday || hasTomorrow

    return (
        <Popover>
            <PopoverTrigger asChild>
                <div className="relative cursor-pointer group">
                    <Button
                        variant="ghost"
                        size="icon"
                        className={[
                            "relative rounded-full transition-colors w-10 h-10",
                            hasToday
                                ? "hover:bg-pink-50 hover:text-pink-500"
                                : hasTomorrow
                                    ? "hover:bg-indigo-50 hover:text-indigo-500"
                                    : "hover:bg-slate-100 text-slate-500",
                        ].join(" ")}
                    >
                        {loading ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <Cake className={`w-5 h-5 ${!hasToday && hasTomorrow ? 'text-indigo-400 opacity-70' : ''}`} />
                        )}
                        {hasToday && (
                            <span className="absolute top-2 right-2 w-2 h-2 bg-pink-500 rounded-full animate-pulse border border-white" />
                        )}
                        {!hasToday && hasTomorrow && (
                            <span className="absolute top-2 right-2 w-2 h-2 bg-indigo-400 rounded-full border border-white" />
                        )}
                    </Button>
                </div>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0" align="end">
                {/* Header */}
                <div className={`p-4 border-b border-slate-100 ${hasToday ? 'bg-pink-50/50' : 'bg-slate-50'}`}>
                    <div className="flex items-center gap-2">
                        <Cake className={`w-4 h-4 ${hasToday ? 'text-pink-500' : 'text-indigo-500'}`} />
                        <h4 className="font-black text-sm uppercase tracking-wide text-slate-800">
                            Дні народження
                        </h4>
                    </div>
                </div>

                <div className="max-h-[400px] overflow-y-auto">
                    {/* Today Section */}
                    {!loading && hasToday && (
                        <div className="p-2">
                            <h5 className="px-2 py-1 text-[10px] font-black uppercase tracking-wider text-pink-500 mb-1">Сьогодні 🎉</h5>
                            {data.today.map((officer) => (
                                <OfficerItem key={officer.id} officer={officer} />
                            ))}
                        </div>
                    )}

                    {/* Divider if both exist */}
                    {hasToday && hasTomorrow && <div className="h-px bg-slate-100 mx-4 my-1" />}

                    {/* Tomorrow Section */}
                    {!loading && hasTomorrow && (
                        <div className="p-2">
                            <h5 className="px-2 py-1 text-[10px] font-black uppercase tracking-wider text-indigo-500 mb-1">Завтра 🕒</h5>
                            {data.tomorrow.map((officer) => (
                                <OfficerItem key={officer.id} officer={officer} />
                            ))}
                        </div>
                    )}

                    {!loading && !hasBirthdays && (
                        <div className="p-4 text-center">
                            <p className="text-sm font-semibold text-slate-700">Сьогодні та завтра днів народження немає</p>
                            <p className="mt-1 text-xs text-slate-500">Іконка залишається активною, щоб ви завжди могли це перевірити.</p>
                        </div>
                    )}
                </div>
            </PopoverContent>
        </Popover>
    )
}

function OfficerItem({ officer }: { officer: BirthdayOfficer }) {
    return (
        <Link
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
    )
}
