'use client'

import { useState } from "react"
import Papa from "papaparse"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Upload, X, Check, AlertTriangle, FileUp } from "lucide-react"
import { toast } from "sonner"

interface ImportDialogProps {
    onSuccess: () => void
}

export function ImportOfficersDialog({ onSuccess }: ImportDialogProps) {
    const [open, setOpen] = useState(false)
    const [stats, setStats] = useState<any>(null)
    const [data, setData] = useState<any[]>([])
    const [loading, setLoading] = useState(false)

    const downloadTemplate = () => {
        const headers = ["Відділення", "Звання", "Номер жетону", "Прізвище", "Ім'я", "По-батькові", "Дата народження", "Телефон", "Служба в ОВС", "Освіта", "Домашня адреса"]
        const example = ["ВРП", "Лейтенант", "00123", "Петренко", "Іван", "Іванович", "1990-05-15", "+380501234567", "2015-12-04", "Вища", "м. Вінниця"]
        const csvContent = "data:text/csv;charset=utf-8,"
            + headers.join(",") + "\n"
            + example.join(",")

        const encodedUri = encodeURI(csvContent)
        const link = document.createElement("a")
        link.setAttribute("href", encodedUri)
        link.setAttribute("download", "officers_template.csv")
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
    }

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
                const rawData = results.data as any[]

                // Basic validation (must have badge and name)
                const validRows = rawData.filter(row =>
                    row["Номер жетону"] || row.badgeNumber || row.Badge ||
                    row["Прізвище"] || row.lastName || row.LastName
                )

                const mappedData = validRows.map(row => ({
                    badgeNumber: row["Номер жетону"] || row.badgeNumber || row.Badge || row.BadgeNumber,
                    firstName: row["Ім'я"] || row.firstName || row.FirstName,
                    lastName: row["Прізвище"] || row.lastName || row.LastName,
                    middleName: row["По-батькові"] || row.middleName || row.MiddleName || null,
                    rank: row["Звання"] || row.rank || row.Rank || null,
                    department: row["Відділення"] || row["Відділення / Підрозділ"] || row.department || row.Department || null,
                    birthDate: row["Дата народження"] || row.birthDate || row.BirthDate || null,
                    phone: row["Телефон"] || row.phone || row.Phone || null,
                    hireDate: row["Дата найму"] || row.hireDate || null,
                    serviceHistory: row["Служба в ОВС"] || row.serviceHistory || null,
                    education: row["Освіта"] || row.education || row.Education || null,
                    address: row["Домашня адреса"] || row["Адреса"] || row.address || row.Address || null,
                    imageUrl: row["Фото"] || row.imageUrl || row.ImageUrl || null
                }))

                setData(mappedData)
                setStats({
                    total: rawData.length,
                    valid: mappedData.length
                })
            }
        })
    }

    const handleSubmit = async () => {
        setLoading(true)
        try {
            const res = await fetch('/api/admin/officers/bulk', {
                method: 'POST',
                body: JSON.stringify({ officers: data })
            })

            const json = await res.json()

            if (res.ok) {
                let msg = `Створено: ${json.created}`
                if (json.updated > 0) msg += `, Оновлено: ${json.updated}`
                toast.success(msg)

                if (json.errors.length > 0) {
                    toast.warning(`${json.errors.length} помилок (пропущено)`)
                }
                setOpen(false)
                onSuccess()
            } else {
                toast.error("Помилка імпорту")
            }
        } catch (e) {
            toast.error("Помилка з'єднання")
        } finally {
            setLoading(false)
            setData([])
            setStats(null)
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" className="gap-2">
                    <FileUp className="w-4 h-4" />
                    Імпорт CSV
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Масовий імпорт офіцерів</DialogTitle>
                </DialogHeader>

                <div className="space-y-6">
                    {!stats ? (
                        <div className="border-2 border-dashed border-slate-200 rounded-xl p-8 text-center space-y-4 hover:bg-slate-50 transition-colors">
                            <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-500">
                                <Upload className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="font-bold text-slate-900">Завантажте CSV файл</h3>
                                <p className="text-sm text-slate-500 mt-1 mb-3">
                                    Підтримуються колонки: <span className="font-mono text-xs bg-slate-100 px-1 rounded">Badge</span>, <span className="font-mono text-xs bg-slate-100 px-1 rounded">FirstName</span>, <span className="font-mono text-xs bg-slate-100 px-1 rounded">LastName</span>
                                </p>
                                <Button variant="link" size="sm" onClick={downloadTemplate} className="text-blue-600 h-auto p-0 font-bold hover:no-underline hover:text-blue-700">
                                    ⬇ Завантажити шаблон
                                </Button>
                            </div>
                            <input
                                type="file"
                                accept=".csv"
                                className="hidden"
                                id="csv-upload"
                                onChange={handleFileUpload}
                            />
                            <Button variant="outline" onClick={() => document.getElementById('csv-upload')?.click()}>
                                Вибрати файл
                            </Button>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="flex gap-4">
                                <div className="flex-1 bg-green-50 p-4 rounded-xl border border-green-100 text-center">
                                    <div className="text-2xl font-bold text-green-700">{stats.valid}</div>
                                    <div className="text-xs text-green-600 font-bold uppercase">Готові до імпорту</div>
                                </div>
                                <div className="flex-1 bg-slate-50 p-4 rounded-xl border border-slate-100 text-center">
                                    <div className="text-2xl font-bold text-slate-700">{stats.total}</div>
                                    <div className="text-xs text-slate-500 font-bold uppercase">Всього рядків</div>
                                </div>
                            </div>

                            <div className="bg-slate-50 rounded-lg p-4 max-h-48 overflow-y-auto text-xs font-mono">
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="text-slate-400 border-b">
                                            <th className="pb-2">Жетон</th>
                                            <th className="pb-2">Офіцер</th>
                                            <th className="pb-2">Звання</th>
                                            <th className="pb-2">Телефон</th>
                                            <th className="pb-2">Служба</th>
                                            <th className="pb-2">Осв.</th>
                                            <th className="pb-2">Адр.</th>
                                            <th className="pb-2 text-right">Фото</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {data.slice(0, 5).map((row, i) => (
                                            <tr key={i} className="border-b transition-colors hover:bg-slate-100">
                                                <td className="py-1">{row.badgeNumber}</td>
                                                <td className="py-1 font-bold">{row.lastName} {row.firstName}</td>
                                                <td className="py-1 text-slate-500">{row.rank || '-'}</td>
                                                <td className="py-1">{row.phone || '-'}</td>
                                                <td className="py-1">{row.hireDate ? '✔' : '-'}</td>
                                                <td className="py-1">{row.education ? '✔' : '-'}</td>
                                                <td className="py-1">{row.address ? '✔' : '-'}</td>
                                                <td className="py-1 text-right">
                                                    {row.imageUrl ? '📸' : '👤'}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                {data.length > 5 && (
                                    <div className="text-center text-slate-400 mt-2 italic">
                                        + ще {data.length - 5} записів...
                                    </div>
                                )}
                            </div>

                            <div className="flex items-center gap-2 justify-end pt-4">
                                <Button variant="ghost" onClick={() => setStats(null)}>Скасувати</Button>
                                <Button onClick={handleSubmit} disabled={loading}>
                                    {loading ? 'Імпорт...' : 'Підтвердити імпорт'}
                                </Button>
                            </div>
                        </div>
                    )}

                    <div className="bg-blue-50 p-4 rounded-lg flex gap-3 text-sm text-blue-700">
                        <AlertTriangle className="w-5 h-5 shrink-0" />
                        <p>
                            Система автоматично пропустить офіцерів, які вже є в базі (перевірка за номером жетону).
                        </p>
                    </div>
                </div>
            </DialogContent>
        </Dialog >
    )
}
