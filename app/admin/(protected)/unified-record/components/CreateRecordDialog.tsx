"use client"

import { useState, useRef, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { format, parseISO, isValid } from "date-fns"
import { uk } from "date-fns/locale"
import { CalendarIcon, Plus, Loader2, Edit2, Sparkles, Image as ImageIcon, Search, UserPlus, XCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { upsertUnifiedRecordAction } from "../actions/recordActions"
import { analyzeRecordImageAction } from "../actions/aiActions"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

const formSchema = z.object({
    id: z.string().optional(),
    eoNumber: z.string().min(1, "Номер ЄО обов'язковий"),
    eoDate: z.date(),
    description: z.string().min(1, "Опис події обов'язковий"),
    applicant: z.string().optional(),
    address: z.string().optional(),
    officerName: z.string().optional(),
    assignedUserId: z.string().optional().nullable(),
    officerIds: z.array(z.string()).optional(),
    category: z.string().optional(),
    recordType: z.string().min(1),
    district: z.string().optional(),
    resolution: z.string().optional(),
    resolutionDate: z.date().optional().nullable(),
})

type FormValues = z.infer<typeof formSchema>

interface CreateRecordDialogProps {
    initialData?: Partial<FormValues>
    users?: { id: string, firstName: string | null, lastName: string | null, username: string }[]
    trigger?: React.ReactNode
}

export default function CreateRecordDialog({ initialData, users = [], trigger }: CreateRecordDialogProps) {
    const [isOpen, setIsOpen] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [isAnalyzing, setIsAnalyzing] = useState(false)
    const [taggedOfficers, setTaggedOfficers] = useState<any[]>((initialData as any)?.officers || [])
    const [officerSearchQuery, setOfficerSearchQuery] = useState("")
    const [officerSearchResults, setOfficerSearchResults] = useState<any[]>([])
    const [isSearchingOfficers, setIsSearchingOfficers] = useState(false)
    const autoOfficerNameRef = useRef("")
    const fileInputRef = useRef<HTMLInputElement>(null)

    const isEdit = !!initialData?.id

    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            id: initialData?.id,
            eoNumber: initialData?.eoNumber || "",
            eoDate: initialData?.eoDate ? new Date(initialData.eoDate) : new Date(),
            description: initialData?.description || "",
            applicant: initialData?.applicant || "",
            address: initialData?.address || "",
            officerName: initialData?.officerName || "",
            assignedUserId: initialData?.assignedUserId || null,
            officerIds: (initialData as any)?.officers?.map((o: any) => o.id) || [],
            category: initialData?.category || "Загальне",
            recordType: initialData?.recordType || "EO",
            district: initialData?.district || "Хмільницький",
            resolution: initialData?.resolution || "",
            resolutionDate: initialData?.resolutionDate ? new Date(initialData.resolutionDate) : null,
        },
    })

    // Reset form when initialData changes (important for re-using the dialog component)
    useEffect(() => {
        if (isOpen) {
            form.reset({
                id: initialData?.id,
                eoNumber: initialData?.eoNumber || "",
                eoDate: initialData?.eoDate ? new Date(initialData.eoDate) : new Date(),
                description: initialData?.description || "",
                applicant: initialData?.applicant || "",
                address: initialData?.address || "",
                officerName: initialData?.officerName || "",
                assignedUserId: initialData?.assignedUserId || null,
                officerIds: (initialData as any)?.officers?.map((o: any) => o.id) || [],
                category: initialData?.category || "Загальне",
                recordType: initialData?.recordType || "EO",
                district: initialData?.district || "Хмільницький",
                resolution: initialData?.resolution || "",
                resolutionDate: initialData?.resolutionDate ? new Date(initialData.resolutionDate) : null,
            })
        }
    }, [initialData, isOpen, form])

    const eoDate = form.watch("eoDate")
    const recordType = form.watch("recordType")

    const formatOfficerForRaport = (o: any) => {
        const position = (o.department || "").trim()
        const rank = (o.rank || "").trim()
        const fullName = [o.lastName, o.firstName].filter(Boolean).join(" ").trim()

        const header = [position, rank].filter(Boolean).join(", ")
        if (header && fullName) return `${header} — ${fullName}`
        return fullName || header
    }

    const onAiScan = () => {
        fileInputRef.current?.click()
    }

    const resizeImage = (base64Str: string): Promise<string> => {
        return new Promise((resolve) => {
            const img = new Image()
            img.src = base64Str
            img.onload = () => {
                const canvas = document.createElement('canvas')
                const MAX_WIDTH = 1024
                const MAX_HEIGHT = 1024
                let width = img.width
                let height = img.height

                if (width > height) {
                    if (width > MAX_WIDTH) {
                        height *= MAX_WIDTH / width
                        width = MAX_WIDTH
                    }
                } else {
                    if (height > MAX_HEIGHT) {
                        width *= MAX_HEIGHT / height
                        height = MAX_HEIGHT
                    }
                }

                canvas.width = width
                canvas.height = height
                const ctx = canvas.getContext('2d')
                ctx?.drawImage(img, 0, 0, width, height)
                resolve(canvas.toDataURL('image/jpeg', 0.8)) // 0.8 quality or lower to save tokens
            }
        })
    }

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        if (!file.type.startsWith('image/')) {
            toast.error("Будь ласка, оберіть зображення")
            return
        }

        setIsAnalyzing(true)
        const toastId = toast.loading("ШІ аналізує фото...")

        try {
            const reader = new FileReader()
            reader.onloadend = async () => {
                const base64 = reader.result as string
                const optimizedBase64 = await resizeImage(base64)
                const result = await analyzeRecordImageAction(optimizedBase64)

                if (result.success && result.data) {
                    const data = result.data

                    // Populate form fields
                    if (data.eoNumber) form.setValue("eoNumber", data.eoNumber)
                    if (data.description) form.setValue("description", data.description)
                    if (data.applicant) form.setValue("applicant", data.applicant)
                    if (data.address) form.setValue("address", data.address)
                    if (data.category) form.setValue("category", data.category)

                    if (data.eoDate) {
                        const parsedDate = parseISO(data.eoDate)
                        if (isValid(parsedDate)) {
                            form.setValue("eoDate", parsedDate)
                        }
                    }

                    toast.success("Дані успішно розпізнано!", { id: toastId })
                } else {
                    toast.error(result.error || "Не вдалося розпізнати дані", { id: toastId })
                }
                setIsAnalyzing(false)
            }
            reader.readAsDataURL(file)
        } catch (error) {
            toast.error("Помилка при обробці файлу", { id: toastId })
            setIsAnalyzing(false)
        }

        // Reset input
        e.target.value = ''
    }

    const onSubmit = async (data: FormValues) => {
        setIsLoading(true)
        try {
            if (data.recordType === "RAPORT") {
                if (!data.officerName?.trim()) {
                    toast.error('Поле "Ким застосовано..." є обовʼязковим')
                    return
                }
                if (!data.description?.trim()) {
                    toast.error('Поле "Дата застосування..." є обовʼязковим')
                    return
                }
                if (!data.address?.trim()) {
                    toast.error('Поле "Підстава застосування..." є обовʼязковим')
                    return
                }
                if (!data.applicant?.trim()) {
                    toast.error('Поле "Дані про оформлення протоколу..." є обовʼязковим')
                    return
                }
            }

            const result = await upsertUnifiedRecordAction({
                ...data,
                officerIds: taggedOfficers.map((o: any) => o.id)
            })
            if (result.success) {
                toast.success(isEdit ? "Запис оновлено" : "Запис успішно збережено")
                setIsOpen(false)
                if (!isEdit) form.reset()
            }
        } catch (error: any) {
            toast.error(error.message || "Помилка збереження")
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        if (isOpen) {
            setTaggedOfficers((initialData as any)?.officers || [])
            setOfficerSearchQuery("")
            setOfficerSearchResults([])
            autoOfficerNameRef.current = ""
        }
    }, [initialData, isOpen])

    useEffect(() => {
        if (recordType !== "RAPORT") {
            setOfficerSearchQuery("")
            setOfficerSearchResults([])
            return
        }

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
                    setOfficerSearchResults(data.filter((o: any) => !taggedOfficers.some((to: any) => to.id === o.id)))
                }
            } catch (error) {
                console.error("Officer search error:", error)
            } finally {
                setIsSearchingOfficers(false)
            }
        }, 300)

        return () => clearTimeout(timer)
    }, [officerSearchQuery, taggedOfficers, recordType])

    useEffect(() => {
        if (recordType !== "RAPORT") return

        const generated = taggedOfficers
            .map((o: any) => formatOfficerForRaport(o))
            .join(", ")

        const current = form.getValues("officerName") || ""
        const prevGenerated = autoOfficerNameRef.current

        // Autocomplete officerName from selected officers only if:
        // 1) field is empty, or 2) field still contains previous auto-generated value
        if (!current.trim() || current === prevGenerated) {
            form.setValue("officerName", generated, { shouldDirty: true })
            autoOfficerNameRef.current = generated
            return
        }

        // User edited manually; keep user text untouched.
    }, [taggedOfficers, recordType, form])

    return (
        <Dialog open={isOpen} onOpenChange={(open) => {
            setIsOpen(open)
            if (!open) {
                // Delay reset slightly to avoid visual glitch during closing animation
                setTimeout(() => form.reset(), 200)
            }
        }}>
            <DialogTrigger asChild>
                {trigger || (
                    <Button className="bg-blue-600 hover:bg-blue-700 text-white rounded-2xl px-6 h-12 shadow-lg shadow-blue-500/20 group transition-all">
                        <Plus className="w-5 h-5 mr-2 group-hover:rotate-90 transition-transform" />
                        Додати запис
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="w-[95%] sm:w-full sm:max-w-[600px] bg-white rounded-[2rem] border-none shadow-2xl p-0 overflow-hidden">
                <DialogHeader className="p-6 md:p-8 bg-slate-900 text-white flex flex-row items-center justify-between">
                    <div>
                        <DialogTitle className="text-xl md:text-2xl font-black italic uppercase tracking-tight">
                            {isEdit ? "Редагування картки" : "Нова картка запису"}
                        </DialogTitle>
                        <p className="text-slate-400 text-[9px] md:text-[10px] font-bold uppercase tracking-widest mt-1">Використовуйте ШІ для автозаповнення</p>
                    </div>

                    {!isEdit && (
                        <>
                            <input
                                type="file"
                                ref={fileInputRef}
                                className="hidden"
                                accept="image/*"
                                onChange={handleFileSelect}
                            />
                            <Button
                                type="button"
                                onClick={onAiScan}
                                disabled={isAnalyzing}
                                className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-3 md:px-4 h-9 md:h-10 shadow-lg shadow-blue-500/20 gap-2 border-none font-bold text-[10px] md:text-xs"
                            >
                                {isAnalyzing ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                    <Sparkles className="w-3.5 h-3.5" />
                                )}
                                <span className="hidden xs:inline">{isAnalyzing ? "Аналіз..." : "Сканувати ШІ"}</span>
                                <span className="xs:hidden">{isAnalyzing ? "..." : "ШІ"}</span>
                            </Button>
                        </>
                    )}
                </DialogHeader>

                <form onSubmit={form.handleSubmit(onSubmit)} className="p-6 md:p-8 space-y-5 md:space-y-6 max-h-[50vh] md:max-h-[70vh] overflow-y-auto custom-scrollbar">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-6">
                        <div className="space-y-2">
                            <Label htmlFor="eoNumber" className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                {recordType === "RAPORT" ? "Номер рапорту / ЄО" : "Номер ЄО"}
                            </Label>
                            <Input
                                id="eoNumber"
                                {...form.register("eoNumber")}
                                placeholder="Напр. 1256"
                                className="rounded-xl border-slate-100 bg-slate-50 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                disabled={isEdit}
                            />
                            {form.formState.errors.eoNumber && (
                                <p className="text-[10px] text-red-500 font-bold">{form.formState.errors.eoNumber.message}</p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Дата</Label>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant={"outline"}
                                        className={cn(
                                            "w-full justify-start text-left font-normal rounded-xl border-slate-100 bg-slate-50 hover:bg-slate-100 transition-all",
                                            !form.getValues("eoDate") && "text-muted-foreground"
                                        )}
                                    >
                                        <CalendarIcon className="mr-2 h-4 w-4 text-blue-500" />
                                        {eoDate ? (
                                            format(eoDate, "PPP", { locale: uk })
                                        ) : (
                                            <span>Оберіть дату</span>
                                        )}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0 rounded-2xl border-none shadow-2xl" align="start">
                                    <Calendar
                                        mode="single"
                                        selected={eoDate}
                                        onSelect={(date) => date && form.setValue("eoDate", date)}
                                        initialFocus
                                        locale={uk}
                                    />
                                </PopoverContent>
                            </Popover>
                        </div>

                        {recordType !== "RAPORT" && (
                            <div className="space-y-2">
                                <Label htmlFor="applicant" className="text-[10px] font-black uppercase tracking-widest text-slate-400">Заявник</Label>
                                <Input
                                    id="applicant"
                                    {...form.register("applicant")}
                                    placeholder="ПІБ заявника"
                                    className="rounded-xl border-slate-100 bg-slate-50 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                />
                            </div>
                        )}

                        <div className="space-y-2">
                            <Label htmlFor="recordType" className="text-[10px] font-black uppercase tracking-widest text-slate-400">Тип запису</Label>
                            <Select
                                onValueChange={(val) => form.setValue("recordType", val)}
                                defaultValue={form.getValues("recordType")}
                            >
                                <SelectTrigger className="rounded-xl border-slate-100 bg-slate-50 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-bold text-xs md:text-sm">
                                    <SelectValue placeholder="Тип" />
                                </SelectTrigger>
                                <SelectContent className="rounded-xl border-none shadow-2xl">
                                    <SelectItem value="EO">Єдиний облік (ЄО)</SelectItem>
                                    <SelectItem value="ZVERN">Звернення</SelectItem>
                                    <SelectItem value="RAPORT">Рапорт застосування</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="assignedUserId" className="text-[10px] font-black uppercase tracking-widest text-slate-400">Виконавець (хто розгляне)</Label>
                            <Select
                                onValueChange={(val) => form.setValue("assignedUserId", val)}
                                defaultValue={form.getValues("assignedUserId") || undefined}
                            >
                                <SelectTrigger className="rounded-xl border-slate-100 bg-slate-50 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-xs md:text-sm">
                                    <SelectValue placeholder="Оберіть інспектора" />
                                </SelectTrigger>
                                <SelectContent className="rounded-xl border-none shadow-2xl">
                                    {users.map(user => (
                                        <SelectItem key={user.id} value={user.id}>
                                            {user.lastName} {user.firstName} ({user.username})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                    </div>

                    {recordType === "RAPORT" ? (
                        <div className="space-y-4">
                            <div className="rounded-2xl border border-violet-200 bg-violet-50/40 p-4">
                                <p className="text-[10px] font-black uppercase tracking-widest text-violet-700">Рапорт застосування</p>
                                <p className="text-xs font-medium text-slate-700 mt-1">
                                    Заповніть форму максимально близько до тексту оригінального рапорту.
                                </p>
                                <p className="text-[11px] font-bold text-rose-600 mt-2">Зірочка (*) позначає обовʼязкове поле</p>
                            </div>

                            <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-2">
                                <Label htmlFor="officerName" className="text-sm font-black tracking-tight text-slate-800">
                                    Ким застосовано зброю, фізичну силу чи спеціальні засоби <span className="text-rose-600">*</span>
                                </Label>
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                                    Додати поліцейських зі списку:
                                </p>

                                {taggedOfficers.length > 0 && (
                                    <div className="flex flex-wrap gap-2 mb-1">
                                        {taggedOfficers.map((o: any) => (
                                            <div key={o.id} className="flex items-center gap-2 bg-blue-50 text-blue-600 border border-blue-100 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-tight">
                                                <span>{formatOfficerForRaport(o)}</span>
                                                <button
                                                    type="button"
                                                    onClick={() => setTaggedOfficers(taggedOfficers.filter((to: any) => to.id !== o.id))}
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
                                        <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xl z-50 max-h-64 overflow-y-auto">
                                            {officerSearchResults.map((o: any) => (
                                                <button
                                                    type="button"
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
                                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                                    Обрано поліцейських: {taggedOfficers.length}
                                </p>
                                <p className="text-xs italic underline text-slate-600">
                                    Приклад: Інспектором (поліцейським) взводу 2 роти 1 батальйону патрульної поліції...
                                </p>
                                <Textarea
                                    id="officerName"
                                    {...form.register("officerName")}
                                    placeholder="Ваша відповідь"
                                    className="rounded-xl border-slate-200 bg-slate-50 min-h-[110px]"
                                />
                            </div>

                            <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-2">
                                <Label htmlFor="description" className="text-sm font-black tracking-tight text-slate-800">
                                    Дата застосування зброї, фізичної сили чи спеціальних засобів (що саме застосовано, період) <span className="text-rose-600">*</span>
                                </Label>
                                <p className="text-xs italic underline text-slate-600">
                                    Приклад: фізична сила з 23:42 10.03.2023, кайданки з 23:42 по 23:58...
                                </p>
                                <Textarea
                                    id="description"
                                    {...form.register("description")}
                                    placeholder="Ваша відповідь"
                                    className="rounded-xl border-slate-200 bg-slate-50 min-h-[110px]"
                                />
                                {form.formState.errors.description && (
                                    <p className="text-[10px] font-bold text-rose-600">{form.formState.errors.description.message}</p>
                                )}
                            </div>

                            <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-2">
                                <Label htmlFor="address" className="text-sm font-black tracking-tight text-slate-800">
                                    Підстава застосування, до кого застосовано <span className="text-rose-600">*</span>
                                </Label>
                                <p className="text-xs italic underline text-slate-600">
                                    Приклад: відповідно до частини 1 ст.44 ЗУ "Про Національну Поліцію"...
                                </p>
                                <Textarea
                                    id="address"
                                    {...form.register("address")}
                                    placeholder="Ваша відповідь"
                                    className="rounded-xl border-slate-200 bg-slate-50 min-h-[110px]"
                                />
                            </div>

                            <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-2">
                                <Label htmlFor="applicant" className="text-sm font-black tracking-tight text-slate-800">
                                    Дані про оформлення протоколу про затримання (згідно КУпАП чи КПК), строки затримання <span className="text-rose-600">*</span>
                                </Label>
                                <p className="text-xs italic underline text-slate-600">
                                    Приклад: складався згідно ст.261, 262, 263 КУпАП, затриманий з ... по ...
                                </p>
                                <Textarea
                                    id="applicant"
                                    {...form.register("applicant")}
                                    placeholder="Ваша відповідь"
                                    className="rounded-xl border-slate-200 bg-slate-50 min-h-[110px]"
                                />
                            </div>
                        </div>
                    ) : (
                        <>
                            <div className="space-y-2">
                                <Label htmlFor="description" className="text-[10px] font-black uppercase tracking-widest text-slate-400">Подія</Label>
                                <Input
                                    id="description"
                                    {...form.register("description")}
                                    placeholder="Напр. ІНШІ СКАРГИ..."
                                    className="rounded-xl border-slate-100 bg-slate-50 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-bold uppercase"
                                />
                                {form.formState.errors.description && (
                                    <p className="text-[10px] text-red-500 font-bold">{form.formState.errors.description.message}</p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="address" className="text-[10px] font-black uppercase tracking-widest text-slate-400">Адреса</Label>
                                <Input
                                    id="address"
                                    {...form.register("address")}
                                    placeholder="Місце події"
                                    className="rounded-xl border-slate-100 bg-slate-50 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                />
                            </div>
                        </>
                    )}
                </form>

                <DialogFooter className="p-4 md:p-8 bg-slate-50 border-t border-slate-100 flex flex-row gap-2 md:gap-4 items-center justify-between">
                    <Button
                        type="button"
                        variant="ghost"
                        onClick={() => {
                            form.reset()
                            setIsOpen(false)
                        }}
                        className="rounded-xl font-bold text-slate-500 hover:text-slate-900 flex-1 md:flex-none"
                    >
                        Скасувати
                    </Button>
                    <Button
                        onClick={form.handleSubmit(onSubmit)}
                        disabled={isLoading}
                        className="bg-slate-900 hover:bg-black text-white rounded-xl px-4 md:px-8 h-10 shadow-lg shadow-slate-900/20 transition-all flex-1 md:flex-none"
                    >
                        {isLoading ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                <span className="hidden xs:inline">Зберігаємо...</span>
                                <span className="xs:hidden">...</span>
                            </>
                        ) : (
                            isEdit ? "Оновити" : "Зберегти"
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
