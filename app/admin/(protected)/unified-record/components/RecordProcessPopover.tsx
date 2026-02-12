'use client'

import React, { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import {
    CheckSquare,
    Briefcase,
    UserPlus,
    XCircle,
    Search,
    Loader2,
    CheckCircle2,
    FileText,
    MoreVertical
} from "lucide-react"
import { cn } from "@/lib/utils"

interface RecordProcessPopoverProps {
    recordId: string
    onProcess: (id: string, resolution: string, officerIds: string[], concernsBpp: boolean) => Promise<void>
    initialResolution?: string
    initialOfficers?: any[]
    initialConcernsBpp?: boolean
    mode?: "default" | "application"
    trigger?: React.ReactNode
}

export default function RecordProcessPopover({
    recordId,
    onProcess,
    initialResolution = "",
    initialOfficers = [],
    initialConcernsBpp = true,
    mode = "default",
    trigger
}: RecordProcessPopoverProps) {
    const isApplicationMode = mode === "application"
    const [concernsBpp, setConcernsBpp] = useState(initialConcernsBpp)
    const [taggedOfficers, setTaggedOfficers] = useState<any[]>(initialOfficers)
    const [officerSearchQuery, setOfficerSearchQuery] = useState("")
    const [officerSearchResults, setOfficerSearchResults] = useState<any[]>([])
    const [isSearchingOfficers, setIsSearchingOfficers] = useState(false)
    const [isProcessing, setIsProcessing] = useState(false)
    const [customResolution, setCustomResolution] = useState(initialResolution)

    useEffect(() => {
        if (!officerSearchQuery.trim() || officerSearchQuery.length < 2) {
            setOfficerSearchResults([])
            return
        }

        const timer = setTimeout(async () => {
            setIsSearchingOfficers(true)
            try {
                const res = await fetch(`/api/admin/officers?search=${encodeURIComponent(officerSearchQuery)}`)
                if (res.ok) {
                    const data = await res.json()
                    setOfficerSearchResults(data.filter((o: any) => !taggedOfficers.some(to => to.id === o.id)))
                }
            } catch (error) {
                console.error("Officer search error:", error)
            } finally {
                setIsSearchingOfficers(false)
            }
        }, 300)

        return () => clearTimeout(timer)
    }, [officerSearchQuery, taggedOfficers])

    const handleProcessClick = async (resolution: string) => {
        if (isProcessing) return
        setIsProcessing(true)
        try {
            await onProcess(recordId, resolution, taggedOfficers, isApplicationMode ? true : concernsBpp)
        } finally {
            setIsProcessing(false)
        }
    }

    return (
        <Popover>
            <PopoverTrigger asChild>
                {trigger || (
                    <Button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black uppercase tracking-widest h-12 gap-2 shadow-lg shadow-emerald-900/10 transition-all hover:scale-[1.02]">
                        <CheckSquare className="w-5 h-5" />
                        ВИКОНАНО
                    </Button>
                )}
            </PopoverTrigger>
            <PopoverContent className="p-4 rounded-[2rem] w-80 shadow-2xl border-none space-y-4 bg-white" align="end">
                <div className="space-y-4">
                    {!isApplicationMode && (
                        <div className="flex items-center justify-between p-3 bg-blue-50/50 rounded-2xl border border-blue-100">
                            <div className="flex items-center gap-3">
                                <div className={cn(
                                    "w-10 h-10 rounded-xl flex items-center justify-center transition-colors",
                                    concernsBpp ? "bg-blue-600/10 text-blue-600" : "bg-slate-200 text-slate-400"
                                )}>
                                    <Briefcase className="w-5 h-5" />
                                </div>
                                <div>
                                    <p className="text-xs font-black uppercase text-slate-900 leading-none mb-1">Стосується поліцейських БПП</p>
                                    <p className="text-[10px] text-slate-600 font-medium">Вимкніть, якщо виклик не за адресою БПП</p>
                                </div>
                            </div>
                            <div
                                onClick={() => {
                                    const newValue = !concernsBpp
                                    setConcernsBpp(newValue)
                                    if (!newValue) setTaggedOfficers([])
                                }}
                                className={cn(
                                    "w-12 h-6 rounded-full cursor-pointer transition-all p-1 relative",
                                    concernsBpp ? "bg-blue-600" : "bg-slate-200"
                                )}
                            >
                                <div className={cn(
                                    "w-4 h-4 rounded-full bg-white shadow-sm transition-all absolute top-1",
                                    concernsBpp ? "left-7" : "left-1"
                                )} />
                            </div>
                        </div>
                    )}

                    {(isApplicationMode || concernsBpp) && (
                        <div className="space-y-3">
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-600 px-2">
                                Виберіть поліцейських:
                            </p>

                            {taggedOfficers.length > 0 && (
                                <div className="flex flex-wrap gap-2 mb-2">
                                    {taggedOfficers.map(o => (
                                        <div key={o.id} className="flex items-center gap-2 bg-blue-50 text-blue-600 border border-blue-100 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-tight">
                                            <span>{o.lastName} ({o.badgeNumber})</span>
                                            <button
                                                onClick={() => setTaggedOfficers(taggedOfficers.filter(to => to.id !== o.id))}
                                                className="hover:text-blue-800"
                                            >
                                                <XCircle className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}

                            <div className="relative">
                                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <Input
                                    placeholder="Прізвище або жетон..."
                                    value={officerSearchQuery}
                                    onChange={(e) => setOfficerSearchQuery(e.target.value)}
                                    className="pl-10 h-11 rounded-xl border-slate-200 text-sm"
                                />

                                {officerSearchResults.length > 0 && (
                                    <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xl z-50">
                                        {officerSearchResults.map(o => (
                                            <button
                                                key={o.id}
                                                onClick={() => {
                                                    setTaggedOfficers([...taggedOfficers, o])
                                                    setOfficerSearchQuery("")
                                                    setOfficerSearchResults([])
                                                }}
                                                className="w-full flex items-center justify-between p-3 hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-0"
                                            >
                                                <div className="text-left">
                                                    <p className="text-sm font-bold text-slate-900">{o.lastName} {o.firstName}</p>
                                                    <p className="text-[10px] text-slate-400 uppercase font-black">{o.badgeNumber} • {o.rank || 'Офіцер'}</p>
                                                </div>
                                                <div className="w-6 h-6 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                                                    <UserPlus className="w-3.5 h-3.5" />
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                )}

                                {isSearchingOfficers && (
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2">
                                        <Loader2 className="w-4 h-4 text-slate-400 animate-spin" />
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {!isApplicationMode && !concernsBpp && (
                        <p className="text-center text-[10px] font-bold text-slate-400 py-4 italic">Не стосується БПП</p>
                    )}

                    <div className="pt-2 border-t border-slate-100 space-y-3">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-2">Виберіть результат:</p>
                        <div className="grid gap-2">
                            {isApplicationMode ? (
                                <>
                                    <Button
                                        variant="ghost"
                                        disabled={isProcessing}
                                        className="justify-start h-auto py-3 px-4 rounded-xl text-left font-bold text-sm bg-slate-50 hover:bg-emerald-50 hover:text-emerald-700 transition-all"
                                        onClick={() => handleProcessClick("дії правомірні - списано в справу")}
                                    >
                                        <CheckCircle2 className="w-4 h-4 mr-2 shrink-0" />
                                        дії правомірні - списано в справу
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        disabled={isProcessing}
                                        className="justify-start h-auto py-3 px-4 rounded-xl text-left font-bold text-sm bg-slate-50 hover:bg-rose-50 hover:text-rose-700 transition-all"
                                        onClick={() => handleProcessClick("дії не правомірні - ініційовано проведення СР")}
                                    >
                                        <FileText className="w-4 h-4 mr-2 shrink-0" />
                                        дії не правомірні - ініційовано проведення СР
                                    </Button>
                                </>
                            ) : (
                                <>
                                    <Button
                                        variant="ghost"
                                        disabled={isProcessing}
                                        className="justify-start h-auto py-3 px-4 rounded-xl text-left font-bold text-sm bg-slate-50 hover:bg-emerald-50 hover:text-emerald-700 transition-all"
                                        onClick={() => handleProcessClick("Списано до справи")}
                                    >
                                        <CheckCircle2 className="w-4 h-4 mr-2 shrink-0" />
                                        Списано до справи
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        disabled={isProcessing}
                                        className="justify-start h-auto py-3 px-4 rounded-xl text-left font-bold text-sm bg-slate-50 hover:bg-blue-50 hover:text-blue-700 transition-all"
                                        onClick={() => handleProcessClick("Надано письмову відповідь")}
                                    >
                                        <FileText className="w-4 h-4 mr-2 shrink-0" />
                                        Надано письмову відповідь
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        disabled={isProcessing}
                                        className="justify-start h-auto py-3 px-4 rounded-xl text-left font-bold text-sm bg-slate-50 hover:bg-amber-50 hover:text-amber-700 transition-all"
                                        onClick={() => handleProcessClick("Надіслано до іншого органу/підрозділу")}
                                    >
                                        <MoreVertical className="w-4 h-4 mr-2 shrink-0" />
                                        Надіслано до іншого органу
                                    </Button>
                                </>
                            )}
                        </div>
                    </div>

                    {!isApplicationMode && (
                        <div className="pt-2 border-t border-slate-100 space-y-3">
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-600 px-2">Свій варіант:</p>
                            <Textarea
                                placeholder="Вкажіть рішення..."
                                disabled={isProcessing}
                                className="rounded-xl bg-slate-50 border-none min-h-[100px] font-medium"
                                value={customResolution}
                                onChange={(e) => setCustomResolution(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && e.ctrlKey && !isProcessing) {
                                        handleProcessClick(customResolution)
                                    }
                                }}
                            />
                            <Button
                                disabled={isProcessing || !customResolution.trim()}
                                className="w-full bg-slate-900 text-white rounded-xl font-black uppercase tracking-widest text-xs h-10 gap-2"
                                onClick={() => handleProcessClick(customResolution)}
                            >
                                {isProcessing && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                                Зберегти свій варіант
                            </Button>
                        </div>
                    )}
                </div>
            </PopoverContent>
        </Popover>
    )
}
