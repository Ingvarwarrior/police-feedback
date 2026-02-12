'use client'

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Upload, FileUp, Loader2, CheckCircle2, AlertTriangle, ArrowRight, X } from "lucide-react"
import { parseUnifiedRecordsAction, saveUnifiedRecordsAction } from "../actions/recordActions"
import { toast } from "sonner"
import { format } from "date-fns"
import { uk } from "date-fns/locale"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

interface ImportDialogProps {
    defaultRecordType?: 'EO' | 'ZVERN' | 'RAPORT'
}

export default function ImportDialog({ defaultRecordType = 'EO' }: ImportDialogProps) {
    const [isOpen, setIsOpen] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [file, setFile] = useState<File | null>(null)
    const [step, setStep] = useState<'upload' | 'preview'>('upload')
    const [previewRecords, setPreviewRecords] = useState<any[]>([])
    const [recordType, setRecordType] = useState<'EO' | 'ZVERN' | 'RAPORT'>(defaultRecordType)

    const handleParse = async () => {
        if (!file) return

        setIsLoading(true)
        const formData = new FormData()
        formData.append('file', file)

        try {
            const result = await parseUnifiedRecordsAction(formData, recordType)
            if (result.success) {
                setPreviewRecords(result.records)
                setStep('preview')
            }
        } catch (error: any) {
            toast.error(error.message || "Помилка читання файлу")
        } finally {
            setIsLoading(false)
        }
    }

    const handleSave = async () => {
        setIsLoading(true)
        try {
            const result = await saveUnifiedRecordsAction(previewRecords)
            if (result.success) {
                toast.success(`Імпорт завершено: ${result.createdCount} нових, ${result.updatedCount} оновлено`)
                setIsOpen(false)
                reset()
            }
        } catch (error: any) {
            toast.error(error.message || "Помилка збереження")
        } finally {
            setIsLoading(false)
        }
    }

    const reset = () => {
        setFile(null)
        setStep('upload')
        setPreviewRecords([])
    }

    return (
        <Dialog open={isOpen} onOpenChange={(val) => {
            setIsOpen(val)
            if (!val) reset()
        }}>
            <DialogTrigger asChild>
                <Button className={cn(
                    "rounded-2xl font-bold gap-2 px-6 shadow-lg transition-all active:scale-95",
                    recordType === 'ZVERN'
                        ? "bg-slate-900 hover:bg-black text-white shadow-slate-200"
                        : recordType === 'RAPORT'
                            ? "bg-rose-600 hover:bg-rose-700 text-white shadow-rose-200"
                            : "bg-blue-600 hover:bg-blue-700 text-white shadow-blue-200"
                )}>
                    <Upload className="w-4 h-4" />
                    {recordType === 'EO' ? 'Імпорт ЄО' : recordType === 'ZVERN' ? 'Імпорт Звернень' : 'Імпорт Рапортів'}
                </Button>
            </DialogTrigger>
            <DialogContent className={`${step === 'preview' ? 'sm:max-w-4xl' : 'sm:max-w-md'} rounded-[2.5rem] p-0 overflow-hidden border-none shadow-2xl`}>
                <DialogHeader className="p-8 pb-0">
                    <DialogTitle className="text-2xl font-black uppercase italic tracking-tight flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600">
                            {step === 'upload' ? <Upload className="w-5 h-5" /> : <CheckCircle2 className="w-5 h-5" />}
                        </div>
                        {step === 'upload'
                            ? (recordType === 'EO'
                                ? 'Імпорт журналів ЄО'
                                : recordType === 'ZVERN'
                                    ? 'Імпорт Звернень громадян'
                                    : 'Імпорт Рапортів застосування')
                            : 'Попередній перегляд'}
                    </DialogTitle>
                </DialogHeader>

                <div className="p-8">
                    {step === 'upload' ? (
                        <div className="space-y-6">
                            <div
                                className={`border-2 border-dashed rounded-[2rem] p-12 text-center transition-all relative group ${file ? 'border-emerald-500 bg-emerald-50/30' : 'border-slate-200 hover:border-blue-400 bg-slate-50/50'
                                    }`}
                                onDragOver={(e) => e.preventDefault()}
                                onDrop={(e) => {
                                    e.preventDefault()
                                    const droppedFile = e.dataTransfer.files[0]
                                    if (droppedFile && (droppedFile.name.endsWith('.xlsx') || droppedFile.name.endsWith('.xls'))) {
                                        setFile(droppedFile)
                                    } else {
                                        toast.error("Будь ласка, оберіть Excel файл (.xlsx або .xls)")
                                    }
                                }}
                            >
                                {file ? (
                                    <div className="space-y-4">
                                        <div className="w-16 h-16 bg-emerald-100 rounded-[1.5rem] flex items-center justify-center mx-auto text-emerald-600 shadow-sm">
                                            <FileUp className="w-8 h-8" />
                                        </div>
                                        <div>
                                            <p className="font-black text-slate-900 text-lg tracking-tight uppercase">{file.name}</p>
                                            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">{(file.size / 1024).toFixed(1)} KB</p>
                                        </div>
                                        <Button variant="ghost" size="sm" onClick={() => setFile(null)} className="text-rose-500 hover:text-rose-600 hover:bg-rose-50 rounded-xl h-10 font-bold px-4">
                                            Скасувати
                                        </Button>
                                    </div>
                                ) : (
                                    <div className="space-y-4 py-4">
                                        <div className="w-16 h-16 bg-blue-100/50 rounded-[1.5rem] flex items-center justify-center mx-auto text-blue-500 mb-2">
                                            <Upload className="w-8 h-8" />
                                        </div>
                                        <div className="space-y-2">
                                            <p className="font-black text-slate-700 uppercase tracking-tight italic">Перетягніть файл сюди</p>
                                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em]">Підтримуються .xlsx, .xls</p>
                                        </div>
                                        <input
                                            type="file"
                                            accept=".xlsx, .xls"
                                            className="absolute inset-0 opacity-0 cursor-pointer"
                                            onChange={(e) => {
                                                const selectedFile = e.target.files?.[0]
                                                if (selectedFile) setFile(selectedFile)
                                            }}
                                        />
                                    </div>
                                )}
                            </div>

                            <div className="space-y-3">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Тип даних для імпорту</Label>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                    <Button
                                        type="button"
                                        variant={recordType === 'EO' ? 'default' : 'outline'}
                                        onClick={() => setRecordType('EO')}
                                        className={cn(
                                            "rounded-xl h-11 font-bold transition-all",
                                            recordType === 'EO' ? "bg-blue-600 shadow-md shadow-blue-200" : "border-slate-200"
                                        )}
                                    >
                                        Єдиний облік
                                    </Button>
                                    <Button
                                        type="button"
                                        variant={recordType === 'ZVERN' ? 'default' : 'outline'}
                                        onClick={() => setRecordType('ZVERN')}
                                        className={cn(
                                            "rounded-xl h-11 font-bold transition-all",
                                            recordType === 'ZVERN' ? "bg-slate-900 shadow-md shadow-slate-200" : "border-slate-200"
                                        )}
                                    >
                                        Звернення
                                    </Button>
                                    <Button
                                        type="button"
                                        variant={recordType === 'RAPORT' ? 'default' : 'outline'}
                                        onClick={() => setRecordType('RAPORT')}
                                        className={cn(
                                            "rounded-xl h-11 font-bold transition-all",
                                            recordType === 'RAPORT' ? "bg-rose-600 shadow-md shadow-rose-200" : "border-slate-200"
                                        )}
                                    >
                                        Рапорти
                                    </Button>
                                </div>
                            </div>

                            <div className="bg-amber-50/50 border border-amber-100 p-5 rounded-[1.5rem] flex items-start gap-4 shadow-sm shadow-amber-100/20">
                                <AlertTriangle className="w-6 h-6 text-amber-500 shrink-0" />
                                <div className="text-[11px] text-amber-900/80 space-y-2 leading-relaxed">
                                    <p className="font-black uppercase tracking-widest text-amber-600">Вимоги до структури:</p>
                                    <p className="font-medium">Для коректного зчитування, файл має містити колонки:</p>
                                    <div className="flex flex-wrap gap-2">
                                        {recordType === 'EO' || recordType === 'RAPORT' ? (
                                            ['№ ЄО', 'подія', 'заявник', 'Рапорт- ПІБ'].map(tag => (
                                                <span key={tag} className="bg-white border border-amber-200 px-2 py-0.5 rounded-lg text-[10px] font-bold">{tag}</span>
                                            ))
                                        ) : (
                                            ['№', 'дата', 'ПІБ', 'Зміст'].map(tag => (
                                                <span key={tag} className="bg-white border border-amber-200 px-2 py-0.5 rounded-lg text-[10px] font-bold">{tag}</span>
                                            ))
                                        )}
                                    </div>
                                    {recordType === 'ZVERN' && (
                                        <p className="text-[9px] font-bold text-slate-500 mt-2 italic">
                                            * № може містити літери та цифри (напр. 123-А або ЗВ-45)
                                        </p>
                                    )}
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 pt-4">
                                <Button
                                    disabled={!file || isLoading}
                                    onClick={handleParse}
                                    className="bg-slate-900 hover:bg-blue-600 text-white rounded-2xl font-black px-10 h-14 uppercase tracking-widest text-xs transition-all shadow-xl shadow-slate-200 flex gap-3 group"
                                >
                                    {isLoading ? (
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                    ) : (
                                        <>
                                            Читати файл
                                            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                        </>
                                    )}
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            <div className="bg-slate-50 border border-slate-100 rounded-[2rem] overflow-hidden">
                                <div className="max-h-[400px] overflow-auto">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="bg-slate-100 px-4">
                                                <th className="p-4 text-[10px] font-black uppercase text-slate-500 tracking-widest">№ ЄО</th>
                                                <th className="p-4 text-[10px] font-black uppercase text-slate-500 tracking-widest">Подія</th>
                                                <th className="p-4 text-[10px] font-black uppercase text-slate-500 tracking-widest">Дата</th>
                                                <th className="p-4 text-[10px] font-black uppercase text-slate-500 tracking-widest">Заявник</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 bg-white">
                                            {previewRecords.slice(0, 50).map((record, idx) => (
                                                <tr key={idx} className="hover:bg-blue-50/30 transition-colors">
                                                    <td className="p-4">
                                                        <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded-lg font-black text-[10px]">{record.eoNumber}</span>
                                                    </td>
                                                    <td className="p-4 max-w-xs truncate text-[11px] font-bold text-slate-700">{record.description || '—'}</td>
                                                    <td className="p-4 text-[10px] font-medium text-slate-500 uppercase">
                                                        {record.eoDate ? format(new Date(record.eoDate), "dd.MM.yyyy", { locale: uk }) : '—'}
                                                    </td>
                                                    <td className="p-4 text-[11px] font-black text-slate-600">{record.applicant || '—'}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                {previewRecords.length > 50 && (
                                    <div className="p-4 bg-slate-100 text-center">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                            Та ще {previewRecords.length - 50} записів...
                                        </p>
                                    </div>
                                )}
                            </div>

                            <div className="flex items-center justify-between p-6 bg-emerald-50 rounded-[2rem] border border-emerald-100">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-emerald-600 shadow-sm border border-emerald-100">
                                        <CheckCircle2 className="w-6 h-6" />
                                    </div>
                                    <div className="space-y-1">
                                        <p className="font-black text-slate-900 uppercase tracking-tight italic">Готово до імпорту</p>
                                        <p className="text-xs text-slate-500 font-medium">Система розпізнала <span className="text-emerald-600 font-black">{previewRecords.length}</span> записів.</p>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <Button
                                        variant="outline"
                                        onClick={() => setStep('upload')}
                                        className="rounded-xl font-bold border-slate-200 h-10"
                                    >
                                        Змінити файл
                                    </Button>
                                    <Button
                                        onClick={handleSave}
                                        disabled={isLoading}
                                        className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black px-8 h-10 uppercase tracking-widest text-[10px]"
                                    >
                                        {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : 'Підтвердити Імпорт'}
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    )
}
