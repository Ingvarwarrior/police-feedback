"use client"

import { useState } from "react"
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
import { CalendarIcon, Plus, Loader2, Edit2, Sparkles, Image as ImageIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { upsertUnifiedRecordAction } from "../actions/recordActions"
import { analyzeRecordImageAction } from "../actions/aiActions"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useRef } from "react"

const formSchema = z.object({
    id: z.string().optional(),
    eoNumber: z.string().min(1, "Номер ЄО обов'язковий"),
    eoDate: z.date(),
    description: z.string().optional(),
    applicant: z.string().optional(),
    address: z.string().optional(),
    officerName: z.string().optional(),
    assignedUserId: z.string().optional().nullable(),
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
            category: initialData?.category || "Загальне",
            recordType: initialData?.recordType || "EO",
            district: initialData?.district || "Хмільницький",
            resolution: initialData?.resolution || "",
            resolutionDate: initialData?.resolutionDate ? new Date(initialData.resolutionDate) : null,
        },
    })

    const eoDate = form.watch("eoDate")
    const resolutionDate = form.watch("resolutionDate")

    const onAiScan = () => {
        fileInputRef.current?.click()
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
                const result = await analyzeRecordImageAction(base64)

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
            const result = await upsertUnifiedRecordAction(data)
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

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                {trigger || (
                    <Button className="bg-blue-600 hover:bg-blue-700 text-white rounded-2xl px-6 h-12 shadow-lg shadow-blue-500/20 group transition-all">
                        <Plus className="w-5 h-5 mr-2 group-hover:rotate-90 transition-transform" />
                        Додати запис
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] bg-white rounded-[2rem] border-none shadow-2xl p-0 overflow-hidden">
                <DialogHeader className="p-8 bg-slate-900 text-white flex flex-row items-center justify-between">
                    <div>
                        <DialogTitle className="text-2xl font-black italic uppercase tracking-tight">
                            {isEdit ? "Редагування картки" : "Нова картка ЄО"}
                        </DialogTitle>
                        <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-1">Використовуйте ШІ для автозаповнення</p>
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
                                className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-4 h-10 shadow-lg shadow-blue-500/20 gap-2 border-none font-bold text-xs"
                            >
                                {isAnalyzing ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <Sparkles className="w-4 h-4" />
                                )}
                                {isAnalyzing ? "Аналіз..." : "Сканувати ШІ"}
                            </Button>
                        </>
                    )}
                </DialogHeader>

                <form onSubmit={form.handleSubmit(onSubmit)} className="p-8 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label htmlFor="eoNumber" className="text-[10px] font-black uppercase tracking-widest text-slate-400">Номер ЄО</Label>
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

                        <div className="space-y-2">
                            <Label htmlFor="applicant" className="text-[10px] font-black uppercase tracking-widest text-slate-400">Заявник</Label>
                            <Input
                                id="applicant"
                                {...form.register("applicant")}
                                placeholder="ПІБ заявника"
                                className="rounded-xl border-slate-100 bg-slate-50 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="recordType" className="text-[10px] font-black uppercase tracking-widest text-slate-400">Тип запису</Label>
                            <Select
                                onValueChange={(val) => form.setValue("recordType", val)}
                                defaultValue={form.getValues("recordType")}
                            >
                                <SelectTrigger className="rounded-xl border-slate-100 bg-slate-50 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-bold">
                                    <SelectValue placeholder="Тип" />
                                </SelectTrigger>
                                <SelectContent className="rounded-xl border-none shadow-2xl">
                                    <SelectItem value="EO">Єдиний облік (ЄО)</SelectItem>
                                    <SelectItem value="ZVERN">Звернення</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="assignedUserId" className="text-[10px] font-black uppercase tracking-widest text-slate-400">Виконавець (Інспектор)</Label>
                            <Select
                                onValueChange={(val) => form.setValue("assignedUserId", val)}
                                defaultValue={form.getValues("assignedUserId") || undefined}
                            >
                                <SelectTrigger className="rounded-xl border-slate-100 bg-slate-50 focus:ring-blue-500/20 focus:border-blue-500 transition-all">
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

                    <div className="space-y-2">
                        <Label htmlFor="description" className="text-[10px] font-black uppercase tracking-widest text-slate-400">Подія (Зміст)</Label>
                        <Textarea
                            id="description"
                            {...form.register("description")}
                            placeholder="Опис події..."
                            className="rounded-xl border-slate-100 bg-slate-50 focus:ring-blue-500/20 focus:border-blue-500 transition-all min-h-[100px]"
                        />
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
                </form>

                <DialogFooter className="p-8 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                    <Button
                        type="button"
                        variant="ghost"
                        onClick={() => setIsOpen(false)}
                        className="rounded-xl font-bold text-slate-500 hover:text-slate-900"
                    >
                        Скасувати
                    </Button>
                    <Button
                        onClick={form.handleSubmit(onSubmit)}
                        disabled={isLoading}
                        className="bg-slate-900 hover:bg-black text-white rounded-xl px-8 shadow-lg shadow-slate-900/20 transition-all"
                    >
                        {isLoading ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Зберігаємо...
                            </>
                        ) : (
                            isEdit ? "Оновити картку" : "Зберегти запис"
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
