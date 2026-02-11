'use client'

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import { Loader2, Save } from "lucide-react"
import { ImageUpload } from "./ImageUpload"

interface OfficerFormProps {
    initialData?: any
    onSubmit: (data: any) => Promise<void>
    loading?: boolean
    submitLabel?: string
}

export function OfficerForm({ initialData, onSubmit, loading, submitLabel = "Зберегти" }: OfficerFormProps) {
    const [formData, setFormData] = useState({
        badgeNumber: initialData?.badgeNumber || "",
        firstName: initialData?.firstName || "",
        middleName: initialData?.middleName || "",
        lastName: initialData?.lastName || "",
        rank: initialData?.rank || "",
        department: initialData?.department || "",
        phone: initialData?.phone || "",
        email: initialData?.email || "",
        driversLicense: initialData?.driversLicense || "",
        imageUrl: initialData?.imageUrl || "",
        hireDate: initialData?.hireDate ? new Date(initialData.hireDate).toISOString().split('T')[0] : "",
        birthDate: initialData?.birthDate ? new Date(initialData.birthDate).toISOString().split('T')[0] : "",
        address: initialData?.address || "",
        education: initialData?.education || "",
        serviceHistory: initialData?.serviceHistory || ""
    })

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        await onSubmit(formData)
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="flex flex-col items-center sm:flex-row sm:items-start gap-6">
                <ImageUpload
                    value={formData.imageUrl}
                    onChange={url => setFormData(prev => ({ ...prev, imageUrl: url || "" }))}
                />

                <div className="flex-1 w-full space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-700 dark:text-slate-300 transition-colors duration-300">Прізвище *</label>
                            <Input
                                value={formData.lastName}
                                onChange={e => setFormData({ ...formData, lastName: e.target.value })}
                                placeholder="Іваненко"
                                required
                                className="dark:bg-slate-800 dark:border-slate-700 dark:text-white transition-colors duration-300"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-700 dark:text-slate-300 transition-colors duration-300">Ім'я *</label>
                            <Input
                                value={formData.firstName}
                                onChange={e => setFormData({ ...formData, firstName: e.target.value })}
                                placeholder="Іван"
                                required
                                className="dark:bg-slate-800 dark:border-slate-700 dark:text-white transition-colors duration-300"
                            />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700 dark:text-slate-300 transition-colors duration-300">По-батькові</label>
                        <Input
                            value={formData.middleName}
                            onChange={e => setFormData({ ...formData, middleName: e.target.value })}
                            placeholder="Іванович"
                            className="dark:bg-slate-800 dark:border-slate-700 dark:text-white transition-colors duration-300"
                        />
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300 transition-colors duration-300">Номер жетону *</label>
                    <Input
                        value={formData.badgeNumber}
                        onChange={e => setFormData({ ...formData, badgeNumber: e.target.value })}
                        placeholder="1234567"
                        className="font-mono dark:bg-slate-800 dark:border-slate-700 dark:text-white transition-colors duration-300"
                        required
                        disabled={!!initialData}
                    />
                </div>
                <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300 transition-colors duration-300">Телефон</label>
                    <Input
                        value={formData.phone}
                        onChange={e => setFormData({ ...formData, phone: e.target.value })}
                        placeholder="+380..."
                        type="tel"
                        className="dark:bg-slate-800 dark:border-slate-700 dark:text-white transition-colors duration-300"
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300 transition-colors duration-300">Email</label>
                    <Input
                        value={formData.email}
                        onChange={e => setFormData({ ...formData, email: e.target.value })}
                        placeholder="officer@police.gov.ua"
                        type="email"
                        className="dark:bg-slate-800 dark:border-slate-700 dark:text-white transition-colors duration-300"
                    />
                </div>
                <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300 transition-colors duration-300">Серія та номер посвідчення водія</label>
                    <Input
                        value={formData.driversLicense}
                        onChange={e => setFormData({ ...formData, driversLicense: e.target.value })}
                        placeholder="ABC 123456"
                        className="dark:bg-slate-800 dark:border-slate-700 dark:text-white transition-colors duration-300"
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300 transition-colors duration-300">Дата народження</label>
                    <Input
                        type="date"
                        value={formData.birthDate}
                        onChange={e => setFormData({ ...formData, birthDate: e.target.value })}
                        className="dark:bg-slate-800 dark:border-slate-700 dark:text-white transition-colors duration-300"
                    />
                </div>
                <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300 transition-colors duration-300">Дата прийняття</label>
                    <Input
                        type="date"
                        value={formData.hireDate}
                        onChange={e => setFormData({ ...formData, hireDate: e.target.value })}
                        className="dark:bg-slate-800 dark:border-slate-700 dark:text-white transition-colors duration-300"
                    />
                </div>
            </div>

            <div className="space-y-4">
                <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300 transition-colors duration-300">Звання</label>
                    <Select value={formData.rank} onValueChange={(val) => setFormData({ ...formData, rank: val })}>
                        <SelectTrigger className="dark:bg-slate-800 dark:border-slate-700 dark:text-white transition-colors duration-300">
                            <SelectValue placeholder="Оберіть звання" />
                        </SelectTrigger>
                        <SelectContent className="dark:bg-slate-800 dark:border-slate-700 dark:text-white">
                            <SelectItem value="Рядовий поліції">Рядовий поліції</SelectItem>
                            <SelectItem value="Капрал поліції">Капрал поліції</SelectItem>
                            <SelectItem value="Сержант поліції">Сержант поліції</SelectItem>
                            <SelectItem value="Лейтенант поліції">Лейтенант поліції</SelectItem>
                            <SelectItem value="Старший лейтенант поліції">Старший лейтенант поліції</SelectItem>
                            <SelectItem value="Капітан поліції">Капітан поліції</SelectItem>
                            <SelectItem value="Майор поліції">Майор поліції</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300 transition-colors duration-300">Відділення / Підрозділ</label>
                    <Input
                        value={formData.department}
                        onChange={e => setFormData({ ...formData, department: e.target.value })}
                        placeholder="Патрульна поліція м. Києва, 1 батальйон"
                        className="dark:bg-slate-800 dark:border-slate-700 dark:text-white transition-colors duration-300"
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300 transition-colors duration-300">Освіта</label>
                    <Input
                        value={formData.education}
                        onChange={e => setFormData({ ...formData, education: e.target.value })}
                        placeholder="Вища освіта..."
                        className="dark:bg-slate-800 dark:border-slate-700 dark:text-white transition-colors duration-300"
                    />
                </div>
                <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300 transition-colors duration-300">Домашня адреса</label>
                    <Input
                        value={formData.address}
                        onChange={e => setFormData({ ...formData, address: e.target.value })}
                        placeholder="Вул. Прикладна, буд. 1..."
                        className="dark:bg-slate-800 dark:border-slate-700 dark:text-white transition-colors duration-300"
                    />
                </div>
            </div>

            <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300 transition-colors duration-300">Служба в ОВС (історія)</label>
                <textarea
                    className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-slate-800 dark:border-slate-700 dark:text-white dark:placeholder:text-slate-500 transition-colors duration-300"
                    value={formData.serviceHistory}
                    onChange={e => setFormData({ ...formData, serviceHistory: e.target.value })}
                    placeholder="З 2015 по 2020..."
                />
            </div>

            <div className="pt-4 flex justify-end">
                <Button type="submit" disabled={loading} className="bg-slate-900 dark:bg-primary dark:text-slate-900 text-white min-w-[150px] transition-colors duration-300">
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : (
                        <>
                            <Save className="w-4 h-4 mr-2" />
                            {submitLabel}
                        </>
                    )}
                </Button>
            </div>
        </form>
    )
}
