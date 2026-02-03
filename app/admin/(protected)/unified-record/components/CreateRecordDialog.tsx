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
import { format } from "date-fns"
import { uk } from "date-fns/locale"
import { CalendarIcon, Plus, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { upsertUnifiedRecordAction } from "../actions/recordActions"

const formSchema = z.object({
    eoNumber: z.string().min(1, "Номер ЄО обов'язковий"),
    eoDate: z.date(),
    description: z.string().optional(),
    applicant: z.string().optional(),
    address: z.string().optional(),
    officerName: z.string().optional(),
    category: z.string().optional(),
    district: z.string().optional(),
    resolution: z.string().optional(),
    resolutionDate: z.date().optional().nullable(),
})

type FormValues = z.infer<typeof formSchema>

export default function CreateRecordDialog() {
    const [isOpen, setIsOpen] = useState(false)
    const [isLoading, setIsLoading] = useState(false)

    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            eoNumber: "",
            eoDate: new Date(),
            description: "",
            applicant: "",
            address: "",
            officerName: "",
            category: "Загальне",
            district: "Хмільницький",
            resolution: "",
            resolutionDate: null,
        },
    })

    const onSubmit = async (data: FormValues) => {
        setIsLoading(true)
        try {
            const result = await upsertUnifiedRecordAction(data)
            if (result.success) {
                toast.success("Запис успішно збережено")
                setIsOpen(false)
                form.reset()
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
                <Button className="bg-blue-600 hover:bg-blue-700 text-white rounded-2xl px-6 h-12 shadow-lg shadow-blue-500/20 group transition-all">
                    <Plus className="w-5 h-5 mr-2 group-hover:rotate-90 transition-transform" />
                    Додати запис
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] bg-white rounded-[2rem] border-none shadow-2xl p-0 overflow-hidden">
                <DialogHeader className="p-8 bg-slate-900 text-white">
                    <DialogTitle className="text-2xl font-black italic uppercase tracking-tight">Нова картка ЄО</DialogTitle>
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
                            />
                            {form.formState.errors.eoNumber && (
                                <p className="text-[10px] text-red-500 font-bold">{form.formState.errors.eoNumber.message}</p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Дата та час</Label>
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
                                        {form.getValues("eoDate") ? (
                                            format(form.getValues("eoDate"), "PPP HH:mm", { locale: uk })
                                        ) : (
                                            <span>Оберіть дату</span>
                                        )}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0 rounded-2xl border-none shadow-2xl" align="start">
                                    <Calendar
                                        mode="single"
                                        selected={form.getValues("eoDate")}
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
                            <Label htmlFor="officerName" className="text-[10px] font-black uppercase tracking-widest text-slate-400">Хто склав (ПІБ)</Label>
                            <Input
                                id="officerName"
                                {...form.register("officerName")}
                                placeholder="Офіцер поліції"
                                className="rounded-xl border-slate-100 bg-slate-50 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                            />
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
                            "Зберегти запис"
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
