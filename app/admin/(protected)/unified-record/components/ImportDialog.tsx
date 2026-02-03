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
import { Upload, FileUp, Loader2, CheckCircle2, AlertTriangle } from "lucide-react"
import { importUnifiedRecordsFromExcel } from "../actions/recordActions"
import { toast } from "sonner"

export default function ImportDialog() {
    const [isOpen, setIsOpen] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [file, setFile] = useState<File | null>(null)

    const handleImport = async () => {
        if (!file) return

        setIsLoading(true)
        const formData = new FormData()
        formData.append('file', file)

        try {
            const result = await importUnifiedRecordsFromExcel(formData)
            if (result.success) {
                toast.success(`Імпортовано ${result.count} записів ЄО`)
                setIsOpen(false)
                setFile(null)
            }
        } catch (error: any) {
            toast.error(error.message || "Помилка імпорту")
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button className="bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold gap-2 px-6 shadow-lg shadow-blue-200">
                    <Upload className="w-4 h-4" />
                    Імпорт з Excel
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md rounded-[2rem]">
                <DialogHeader>
                    <DialogTitle className="text-xl font-black uppercase italic tracking-tight">Імпорт журналів ЄО</DialogTitle>
                </DialogHeader>
                <div className="space-y-6 pt-4">
                    <div
                        className={`border-2 border-dashed rounded-3xl p-10 text-center transition-all ${file ? 'border-emerald-500 bg-emerald-50/50' : 'border-slate-200 hover:border-blue-400 bg-slate-50'
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
                            <div className="space-y-3">
                                <div className="w-12 h-12 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto text-emerald-600">
                                    <FileUp className="w-6 h-6" />
                                </div>
                                <div>
                                    <p className="font-bold text-slate-900">{file.name}</p>
                                    <p className="text-xs text-slate-500">{(file.size / 1024).toFixed(1)} KB</p>
                                </div>
                                <Button variant="ghost" size="sm" onClick={() => setFile(null)} className="text-rose-500 hover:text-rose-600 hover:bg-rose-50 h-8">
                                    Скасувати
                                </Button>
                            </div>
                        ) : (
                            <div className="space-y-3 pointer-events-none">
                                <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto text-blue-500">
                                    <Upload className="w-6 h-6" />
                                </div>
                                <div className="space-y-1">
                                    <p className="font-bold text-slate-700">Перетягніть файл сюди або натисніть</p>
                                    <p className="text-xs text-slate-400">Підтримуються формати .xlsx, .xls</p>
                                </div>
                                <input
                                    type="file"
                                    accept=".xlsx, .xls"
                                    className="absolute inset-0 opacity-0 cursor-pointer pointer-events-auto"
                                    onChange={(e) => {
                                        const selectedFile = e.target.files?.[0]
                                        if (selectedFile) setFile(selectedFile)
                                    }}
                                />
                            </div>
                        )}
                    </div>

                    <div className="bg-amber-50 border border-amber-100 p-4 rounded-2xl flex items-start gap-3">
                        <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                        <div className="text-xs text-amber-800 space-y-1">
                            <p className="font-bold uppercase tracking-tight">Вимоги до файлу:</p>
                            <p>Система шукає колонки: "№ ЄО", "дата, час повідомлення", "подія", "Рапорт- ПІБ хто склав", "заявник".</p>
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                        <Button variant="ghost" onClick={() => setIsOpen(false)} className="rounded-xl font-bold">
                            Скасувати
                        </Button>
                        <Button
                            disabled={!file || isLoading}
                            onClick={handleImport}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold px-8"
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                    Обробка...
                                </>
                            ) : (
                                "Завантажити дані"
                            )}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
