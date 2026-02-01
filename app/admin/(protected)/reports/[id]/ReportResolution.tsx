import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { CheckCircle2, PhoneCall, FileEdit, Loader2, Users, Search, X, ShieldCheck } from "lucide-react"
import { toast } from "sonner"
import { Input } from "@/components/ui/input"
import { RESOLUTION_TEMPLATES } from "@/lib/resolution-templates"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Sparkles } from "lucide-react"

interface Officer {
    id: string
    firstName: string
    lastName: string
    badgeNumber: string
    rank: string | null
}

interface ReportResolutionProps {
    responseId: string
    initialNotes: string | null
    initialCategory: string | null
    initialTaggedOfficers?: Officer[]
    canEdit: boolean
}

export default function ReportResolution({ responseId, initialNotes, initialCategory, initialTaggedOfficers = [], canEdit }: ReportResolutionProps) {
    const [notes, setNotes] = useState(initialNotes || "")
    const [category, setCategory] = useState(initialCategory || "ASSISTANCE")
    const [taggedOfficers, setTaggedOfficers] = useState<Officer[]>(initialTaggedOfficers)
    const [saving, setSaving] = useState(false)

    // Officer Search State
    const [searchQuery, setSearchQuery] = useState("")
    const [searchResults, setSearchResults] = useState<Officer[]>([])
    const [searching, setSearching] = useState(false)

    useEffect(() => {
        if (!searchQuery.trim() || searchQuery.length < 2) {
            setSearchResults([])
            return
        }

        const timer = setTimeout(async () => {
            setSearching(true)
            try {
                const res = await fetch(`/api/admin/officers?search=${encodeURIComponent(searchQuery)}`)
                if (res.ok) {
                    const data = await res.json()
                    // Filter out already tagged
                    setSearchResults(data.filter((o: Officer) => !taggedOfficers.some(to => to.id === o.id)))
                }
            } catch (error) {
                console.error("Search error:", error)
            } finally {
                setSearching(false)
            }
        }, 300)

        return () => clearTimeout(timer)
    }, [searchQuery, taggedOfficers])

    const handleSave = async () => {
        if (!notes.trim() || !category) {
            toast.error('❌ заповніть всі поля')
            return
        }

        setSaving(true)
        try {
            const res = await fetch('/api/admin/resolve', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    responseId,
                    resolutionNotes: notes,
                    incidentCategory: category,
                    taggedOfficerIds: taggedOfficers.map(o => o.id)
                })
            })
            if (res.ok) {
                toast.success('✅ Резолюцію успішно збережено')
                window.location.reload()
            } else {
                toast.error('❌ Помилка при збереженні резолюції')
            }
        } catch (error) {
            console.error(error)
            toast.error('❌ Помилка при збереженні резолюції')
        } finally {
            setSaving(false)
        }
    }

    const addOfficer = (officer: Officer) => {
        setTaggedOfficers([...taggedOfficers, officer])
        setSearchQuery("")
        setSearchResults([])
    }

    const removeOfficer = (id: string) => {
        setTaggedOfficers(taggedOfficers.filter(o => o.id !== id))
    }

    // Read-only view when resolved
    if (!canEdit && initialNotes) {
        return (
            <div className="p-6 bg-emerald-50 rounded-[2.5rem] border border-emerald-200 space-y-6 shadow-sm">
                <div className="flex items-center gap-2 text-emerald-600 font-black text-[10px] uppercase tracking-widest">
                    <CheckCircle2 className="w-4 h-4" />
                    Опрацьовано та закрито
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                    <div className="space-y-4">
                        <div>
                            <p className="text-[10px] text-emerald-700 font-black uppercase tracking-widest mb-1">Категорія</p>
                            <p className="text-slate-900 font-bold">{getCategoryLabel(initialCategory)}</p>
                        </div>
                        <div>
                            <p className="text-[10px] text-emerald-700 font-black uppercase tracking-widest mb-1">Нотатки</p>
                            <p className="text-slate-700 italic leading-relaxed">"{initialNotes}"</p>
                        </div>
                    </div>

                    {initialTaggedOfficers.length > 0 && (
                        <div className="bg-white/50 p-4 rounded-2xl border border-emerald-100">
                            <p className="text-[10px] text-emerald-700 font-black uppercase tracking-widest mb-3 flex items-center gap-2">
                                <Users className="w-3.5 h-3.5" />
                                Причетні офіцери
                            </p>
                            <div className="space-y-2">
                                {initialTaggedOfficers.map(o => (
                                    <div key={o.id} className="flex items-center gap-2 text-sm bg-white p-2 rounded-xl border border-slate-100 shadow-sm">
                                        <div className="p-1.5 bg-slate-100 rounded-lg text-slate-500">
                                            <ShieldCheck className="w-3.5 h-3.5" />
                                        </div>
                                        <div>
                                            <p className="font-bold text-slate-900">{o.lastName} {o.firstName[0]}.</p>
                                            <p className="text-[10px] text-slate-400 font-medium">{o.badgeNumber} • {o.rank || 'Офіцер'}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        )
    }

    // Editable form
    if (canEdit) {
        return (
            <div className="p-8 bg-slate-900 rounded-[2.5rem] border border-slate-800 space-y-8 shadow-2xl">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-emerald-500/20 rounded-2xl">
                        <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                    </div>
                    <div>
                        <h3 className="text-white font-black uppercase tracking-tight italic text-lg">Результат перевірки</h3>
                        <p className="text-slate-400 text-xs font-medium">Зафіксуйте підсумки спілкування та причетних осіб</p>
                    </div>
                </div>

                <div className="space-y-6">
                    {/* Category */}
                    <div className="space-y-2">
                        <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Категорія інциденту</p>
                        <Select value={category} onValueChange={setCategory}>
                            <SelectTrigger className="bg-slate-800 border-slate-700 text-white rounded-xl h-12">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-slate-800 border-slate-700 text-white rounded-xl">
                                <SelectItem value="TRAFFIC">Дорожній рух (ДТП, ПДР)</SelectItem>
                                <SelectItem value="DOC_CHECK">Перевірка документів</SelectItem>
                                <SelectItem value="ASSISTANCE">Допомога громадянину</SelectItem>
                                <SelectItem value="CRIME">Кримінальне правопорушення</SelectItem>
                                <SelectItem value="OTHER">Інше / Консультація</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Tagging Officers */}
                    <div className="space-y-3">
                        <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest flex items-center gap-2">
                            <Users className="w-3.5 h-3.5" />
                            Офіцери, яких стосується звіт
                        </p>

                        {/* Tagged List */}
                        <div className="flex flex-wrap gap-2 mb-3">
                            {taggedOfficers.map(o => (
                                <div key={o.id} className="flex items-center gap-2 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-3 py-1.5 rounded-xl text-xs font-bold transition-all hover:bg-emerald-500/20">
                                    <span>{o.lastName} ({o.badgeNumber})</span>
                                    <button onClick={() => removeOfficer(o.id)} className="hover:text-white">
                                        <X className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            ))}
                        </div>

                        {/* Search Input */}
                        <div className="relative">
                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                            <Input
                                placeholder="Пошук офіцера за прізвищем або жетоном..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-10 h-12 bg-slate-800 border-slate-700 text-white rounded-xl placeholder:text-slate-500 focus:ring-emerald-500"
                            />

                            {/* Search Results Dropdown */}
                            {searchResults.length > 0 && (
                                <div className="absolute top-full left-0 right-0 mt-2 bg-slate-800 border border-slate-700 rounded-xl overflow-hidden shadow-2xl z-50">
                                    {searchResults.map(o => (
                                        <button
                                            key={o.id}
                                            onClick={() => addOfficer(o)}
                                            className="w-full flex items-center justify-between p-3 hover:bg-slate-700 transition-colors border-b border-slate-700/50 last:border-0"
                                        >
                                            <div className="text-left">
                                                <p className="text-sm font-bold text-white">{o.lastName} {o.firstName}</p>
                                                <p className="text-[10px] text-slate-400 uppercase font-black">{o.badgeNumber} • {o.rank || 'Офіцер'}</p>
                                            </div>
                                            <Button size="sm" variant="ghost" className="h-8 text-[10px] font-black uppercase text-emerald-400 hover:bg-emerald-400 hover:text-slate-900">
                                                Вибрати
                                            </Button>
                                        </button>
                                    ))}
                                </div>
                            )}

                            {searching && (
                                <div className="absolute right-4 top-1/2 -translate-y-1/2">
                                    <Loader2 className="w-4 h-4 text-slate-500 animate-spin" />
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest flex items-center gap-2">
                                <FileEdit className="w-3.5 h-3.5" />
                                Фінальна резолюція (підсумок опрацювання)
                            </p>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="sm" className="h-7 text-[9px] font-black uppercase tracking-widest text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 gap-1.5 rounded-lg px-2">
                                        <Sparkles className="w-3 h-3" />
                                        Шаблони
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="bg-slate-800 border-slate-700 text-white rounded-xl w-64 p-2 shadow-2xl">
                                    {RESOLUTION_TEMPLATES.map(t => (
                                        <DropdownMenuItem
                                            key={t.id}
                                            onClick={() => {
                                                setNotes(t.text)
                                                setCategory(t.category)
                                            }}
                                            className="rounded-lg text-xs font-bold hover:bg-slate-700 cursor-pointer p-3 flex flex-col items-start gap-1"
                                        >
                                            <span>{t.label}</span>
                                            <span className="text-[9px] text-slate-500 font-medium line-clamp-1">{t.text}</span>
                                        </DropdownMenuItem>
                                    ))}
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                        <Textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Наприклад: Проведено бесіду з громадянином. Вказані офіцери діяли згідно за статтею 35..."
                            className="min-h-[140px] bg-slate-800 border-slate-700 text-white rounded-2xl resize-none focus:ring-emerald-500 shadow-inner leading-relaxed"
                        />
                    </div>

                    <Button
                        onClick={handleSave}
                        disabled={saving}
                        className="w-full h-14 bg-emerald-500 text-slate-900 hover:bg-emerald-400 font-black uppercase tracking-widest text-xs rounded-2xl shadow-xl shadow-emerald-950/20 transition-all border-none"
                    >
                        {saving ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                            <>
                                Завершити опрацювання та закрити кейс
                                <PhoneCall className="ml-3 w-4 h-4" />
                            </>
                        )}
                    </Button>
                </div>
            </div>
        )
    }

    return null
}

// Helper function for category labels
function getCategoryLabel(category: string | null): string {
    const labels: Record<string, string> = {
        'TRAFFIC': 'Дорожній рух (ДТП, ПДР)',
        'DOC_CHECK': 'Перевірка документів',
        'ASSISTANCE': 'Допомога громадянину',
        'CRIME': 'Кримінальне правопорушення',
        'OTHER': 'Інше / Консультація'
    }
    return labels[category || ''] || 'Не вказано'
}
