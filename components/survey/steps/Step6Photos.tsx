'use client'

import React, { useState } from 'react'
import { useSurveyStore } from '@/lib/store'
import { Button } from '@/components/ui/button'
import { X, Upload, Loader2, Image as ImageIcon, ShieldAlert, Camera, Video } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

export default function Step6Photos() {
    const { setStep, updateData, formData } = useSurveyStore()
    const [uploading, setUploading] = useState(false)
    const [localPreviews, setLocalPreviews] = useState<Record<string, { url: string, isVideo: boolean }>>({})

    const handleNext = () => setStep(7)
    const handleBack = () => setStep(5)

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files?.length) return

        const files = Array.from(e.target.files)
        if (formData.attachmentIds.length + files.length > 5) {
            toast.error("Максимум 5 медіа-файлів")
            return
        }

        setUploading(true)

        for (const file of files) {
            if (file.size > 100 * 1024 * 1024) {
                toast.error(`Файл ${file.name} завеликий (ліміт 100МБ)`)
                continue
            }

            try {
                const fData = new FormData()
                fData.append('file', file)
                const res = await fetch('/api/upload', { method: 'POST', body: fData })

                if (res.ok) {
                    const { id } = await res.json()
                    const preview = URL.createObjectURL(file)
                    const isVideo = file.type.startsWith('video/')
                    setLocalPreviews(prev => ({ ...prev, [id]: { url: preview, isVideo } }))
                    updateData({ attachmentIds: [...formData.attachmentIds, id] })
                } else {
                    toast.error("Помилка при завантаженні")
                }
            } catch (err) {
                toast.error("Помилка завантаження файлу")
                console.error(err)
            }
        }
        setUploading(false)
        e.target.value = ''
    }

    const removePhoto = (id: string) => {
        updateData({ attachmentIds: formData.attachmentIds.filter(pid => pid !== id) })
    }

    const isSecure = typeof window !== 'undefined' && window.isSecureContext;

    return (
        <div className="space-y-8 h-full flex flex-col justify-center">
            <div className="space-y-2">
                <h2 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-3 italic uppercase">
                    <div className="w-1.5 h-6 bg-primary" />
                    Медіа-фіксація
                </h2>
                <p className="text-slate-500 text-sm font-medium px-4 md:px-0">Додайте фото чи відео з місця події. Можна обрати з галереї або зняти на камеру.</p>
            </div>

            <div className="space-y-6 flex-1 py-4">
                {!isSecure && window.location.hostname !== 'localhost' && (
                    <div className="p-4 bg-rose-50 rounded-2xl border border-rose-100 flex gap-3 shadow-sm mb-2">
                        <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                        <p className="text-[11px] text-rose-800 font-bold leading-relaxed">
                            Увага: Камера може бути заблокована браузером через незахищене з'єднання (HTTP). Для повноцінної роботи використовуйте HTTPS.
                        </p>
                    </div>
                )}

                <div className="grid grid-cols-3 gap-4">
                    {formData.attachmentIds.map(id => (
                        <div key={id} className="relative aspect-square bg-slate-50 rounded-[2rem] overflow-hidden border-2 border-slate-100 shadow-xl group">
                            {localPreviews[id]?.isVideo ? (
                                <video
                                    src={localPreviews[id]?.url}
                                    className="w-full h-full object-cover"
                                    controls
                                />
                            ) : (
                                <img
                                    src={localPreviews[id]?.url || '/placeholder.png'}
                                    alt="Uploaded"
                                    className="w-full h-full object-cover transition-transform group-hover:scale-110"
                                />
                            )}
                            <button
                                onClick={() => removePhoto(id)}
                                className="absolute top-2 right-2 bg-white/90 text-rose-500 p-2 rounded-full hover:bg-rose-500 hover:text-white transition-all shadow-lg backdrop-blur-sm"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    ))}

                    {formData.attachmentIds.length < 5 && (
                        <label className="flex flex-col items-center justify-center aspect-square rounded-[2rem] border-2 border-dashed border-slate-200 hover:border-primary hover:bg-primary/5 cursor-pointer transition-all group relative overflow-hidden bg-white shadow-inner">
                            {uploading ? (
                                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                            ) : (
                                <>
                                    <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center mb-3 group-hover:bg-primary group-hover:text-secondary transition-all text-slate-400">
                                        <div className="relative">
                                            <Camera className="w-6 h-6" />
                                            <Video className="w-4 h-4 absolute -bottom-1 -right-2 bg-white rounded-full p-0.5" />
                                        </div>
                                    </div>
                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 group-hover:text-primary transition-colors text-center px-2">Фото або Відео</span>
                                </>
                            )}
                            <input
                                type="file"
                                className="hidden"
                                accept="image/*,video/*"
                                multiple
                                disabled={uploading}
                                onChange={handleFileChange}
                            />
                        </label>
                    )}
                </div>

                <div className="p-6 bg-primary/5 rounded-[2rem] border border-primary/10 flex gap-4 shadow-sm">
                    <div className="w-10 h-10 rounded-2xl bg-primary text-secondary flex items-center justify-center shrink-0">
                        <ShieldAlert className="w-5 h-5" />
                    </div>
                    <p className="text-[11px] text-slate-600 font-bold leading-relaxed">
                        Ми автоматично видалимо всі метадані (EXIF) з ваших фото для забезпечення вашої повної анонімності та безпеки.
                    </p>
                </div>
            </div>

            <div className="flex gap-4 pt-4 mt-auto">
                <Button variant="ghost" onClick={handleBack} className="flex-1 h-14 rounded-2xl font-bold uppercase tracking-widest text-xs text-slate-400">Назад</Button>
                <Button onClick={handleNext} className="flex-[2] h-14 rounded-2xl font-black uppercase tracking-[0.2em] text-xs shadow-2xl bg-primary text-secondary hover:bg-primary/90 transition-all">
                    {formData.attachmentIds.length > 0 ? 'Далі' : 'Пропустити'}
                </Button>
            </div>
        </div>
    )
}
