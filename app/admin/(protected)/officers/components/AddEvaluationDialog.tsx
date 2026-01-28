'use client'

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Star, Upload, X, Image as ImageIcon } from "lucide-react"
import { toast } from "sonner"

interface AddEvaluationDialogProps {
    officerId: string
    onSuccess: () => void
    open: boolean
    setOpen: (open: boolean) => void
    variant?: 'default' | 'outline' | 'ghost' | 'list'
}

export function AddEvaluationDialog({ officerId, onSuccess, open, setOpen, variant = 'default' }: AddEvaluationDialogProps) {
    const [evalData, setEvalData] = useState({
        type: "INTERNAL_REVIEW",
        scoreKnowledge: 0,
        scoreTactics: 0,
        scoreCommunication: 0,
        scoreProfessionalism: 0,
        scorePhysical: 0,
        notes: "",
        strengths: "",
        recommendations: ""
    })

    const [lowRatingIssues, setLowRatingIssues] = useState<{ [key: string]: { description: string, photos: File[] } }>({})

    const handleSubmit = async () => {
        try {
            const res = await fetch(`/api/admin/officers/${officerId}/evaluations`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...evalData,
                    lowRatingIssues: Object.entries(lowRatingIssues).map(([category, data]) => ({
                        category,
                        description: data.description,
                        photoCount: data.photos.length
                    }))
                })
            })
            if (res.ok) {
                toast.success("✅ Оцінку зафіксовано")
                setOpen(false)
                onSuccess()
            }
        } catch (e) {
            toast.error("❌ Помилка збереження")
        }
    }

    const updateLowRatingIssue = (category: string, field: 'description' | 'photos', value: any) => {
        setLowRatingIssues(prev => ({
            ...prev,
            [category]: {
                description: field === 'description' ? value : (prev[category]?.description || ''),
                photos: field === 'photos' ? value : (prev[category]?.photos || [])
            }
        }))
    }

    const triggerButton = variant === 'list' ? (
        <Button variant="outline" size="sm" className="rounded-xl font-bold border-primary/20 text-primary hover:bg-primary/5 h-8 px-3 text-[10px] uppercase tracking-wider">
            Оцінити
        </Button>
    ) : (
        <Button className="rounded-2xl font-black uppercase tracking-widest text-[9px] h-11 bg-primary text-secondary shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all w-full md:w-auto px-8">
            + Оцінити
        </Button>
    )

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {triggerButton}
            </DialogTrigger>
            <DialogContent className="w-[95%] sm:max-w-xl max-h-[90vh] overflow-y-auto rounded-[3rem] border-0 shadow-2xl p-8 sm:p-10">
                <DialogHeader className="mb-8">
                    <DialogTitle className="text-3xl font-black uppercase tracking-tight text-slate-900 italic">
                        Професійна атестація
                    </DialogTitle>
                    <p className="text-slate-500 font-medium text-sm">Встановіть бали за ключовими компетенціями</p>
                </DialogHeader>
                <div className="space-y-8 py-2">
                    <div className="space-y-5">
                        <RatingInput
                            label="📚 Знання законодавства"
                            value={evalData.scoreKnowledge}
                            onChange={(v: number) => setEvalData({ ...evalData, scoreKnowledge: v })}
                            category="knowledge"
                            lowRatingData={lowRatingIssues['knowledge']}
                            onLowRatingUpdate={(field: 'description' | 'photos', value: any) => updateLowRatingIssue('knowledge', field, value)}
                        />
                        <RatingInput
                            label="⚡ Тактика та безпека"
                            value={evalData.scoreTactics}
                            onChange={(v: number) => setEvalData({ ...evalData, scoreTactics: v })}
                            category="tactics"
                            lowRatingData={lowRatingIssues['tactics']}
                            onLowRatingUpdate={(field: 'description' | 'photos', value: any) => updateLowRatingIssue('tactics', field, value)}
                        />
                        <RatingInput
                            label="💬 Комунікація"
                            value={evalData.scoreCommunication}
                            onChange={(v: number) => setEvalData({ ...evalData, scoreCommunication: v })}
                            category="communication"
                            lowRatingData={lowRatingIssues['communication']}
                            onLowRatingUpdate={(field: 'description' | 'photos', value: any) => updateLowRatingIssue('communication', field, value)}
                        />
                        <RatingInput
                            label="⭐ Професіоналізм"
                            value={evalData.scoreProfessionalism}
                            onChange={(v: number) => setEvalData({ ...evalData, scoreProfessionalism: v })}
                            category="professionalism"
                            lowRatingData={lowRatingIssues['professionalism']}
                            onLowRatingUpdate={(field: 'description' | 'photos', value: any) => updateLowRatingIssue('professionalism', field, value)}
                        />
                        <RatingInput
                            label="💪 Фізична підготовка"
                            value={evalData.scorePhysical}
                            onChange={(v: number) => setEvalData({ ...evalData, scorePhysical: v })}
                            category="physical"
                            lowRatingData={lowRatingIssues['physical']}
                            onLowRatingUpdate={(field: 'description' | 'photos', value: any) => updateLowRatingIssue('physical', field, value)}
                        />
                    </div>

                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-2">Примітки / Резюме</Label>
                            <Textarea
                                className="rounded-[1.5rem] border-slate-200 bg-slate-50 focus:bg-white transition-all min-h-[100px] resize-none text-base p-5"
                                placeholder="Додайте короткий коментар до оцінки..."
                                value={evalData.notes}
                                onChange={e => setEvalData({ ...evalData, notes: e.target.value })}
                            />
                        </div>
                    </div>

                    <Button
                        className="w-full h-14 rounded-2xl font-black uppercase tracking-widest text-xs bg-slate-900 hover:bg-slate-800 shadow-xl shadow-slate-900/20 active:scale-[0.98] transition-all"
                        onClick={handleSubmit}
                    >
                        Зафіксувати в журналі
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    )
}

interface RatingInputProps {
    label: string
    value: number
    onChange: (value: number) => void
    category: string
    lowRatingData?: { description: string, photos: File[] }
    onLowRatingUpdate: (field: 'description' | 'photos', value: any) => void
}

function RatingInput({ label, value, onChange, category, lowRatingData, onLowRatingUpdate }: RatingInputProps) {
    const showLowRatingFields = value > 0 && value <= 3

    const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const newPhotos = Array.from(e.target.files)
            const currentPhotos = lowRatingData?.photos || []
            onLowRatingUpdate('photos', [...currentPhotos, ...newPhotos])
        }
    }

    const removePhoto = (index: number) => {
        const currentPhotos = lowRatingData?.photos || []
        onLowRatingUpdate('photos', currentPhotos.filter((_: any, i: number) => i !== index))
    }

    return (
        <div className="flex flex-col gap-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 gap-4">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-700 sm:w-1/2 leading-tight">{label}</Label>
                <div className="flex gap-2 justify-end">
                    {[1, 2, 3, 4, 5].map((star) => (
                        <button
                            key={star}
                            onClick={() => onChange(star)}
                            className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${value >= star
                                ? 'bg-amber-400 text-white shadow-lg shadow-amber-400/30 scale-105'
                                : 'bg-white text-slate-300 border border-slate-200 hover:border-amber-200'}`}
                        >
                            <Star className={`w-4 h-4 ${value >= star ? 'fill-current' : ''}`} />
                        </button>
                    ))}
                </div>
            </div>

            {/* Low Rating Issue Form */}
            {showLowRatingFields && (
                <div className="p-4 bg-rose-50 border-2 border-rose-200 rounded-2xl space-y-3 animate-in slide-in-from-top-2 duration-300">
                    <div className="flex items-center gap-2 text-rose-700 mb-2">
                        <div className="w-6 h-6 rounded-full bg-rose-500 text-white flex items-center justify-center text-xs font-black">!</div>
                        <span className="text-[10px] font-black uppercase tracking-widest">Опишіть проблему</span>
                    </div>

                    <Textarea
                        className="rounded-xl border-rose-300 bg-white focus:border-rose-400 transition-all min-h-[80px] resize-none text-sm p-3"
                        placeholder="Детально опишіть виявлені недоліки або проблеми..."
                        value={lowRatingData?.description || ''}
                        onChange={(e) => onLowRatingUpdate('description', e.target.value)}
                    />

                    {/* Photo Upload */}
                    <div className="space-y-2">
                        <Label className="text-[9px] font-black uppercase tracking-widest text-rose-700">Додайте фото (опціонально)</Label>

                        {lowRatingData?.photos && lowRatingData.photos.length > 0 && (
                            <div className="grid grid-cols-3 gap-2">
                                {lowRatingData.photos.map((photo: File, index: number) => (
                                    <div key={index} className="relative group">
                                        <div className="aspect-square rounded-lg bg-slate-200 flex items-center justify-center overflow-hidden">
                                            <ImageIcon className="w-8 h-8 text-slate-400" />
                                        </div>
                                        <button
                                            onClick={() => removePhoto(index)}
                                            className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-rose-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            <X className="w-3 h-3" />
                                        </button>
                                        <p className="text-[8px] text-slate-500 mt-1 truncate">{photo.name}</p>
                                    </div>
                                ))}
                            </div>
                        )}

                        <label className="flex items-center justify-center gap-2 px-4 py-2 bg-white border-2 border-dashed border-rose-300 rounded-xl hover:border-rose-400 hover:bg-rose-50 transition-all cursor-pointer">
                            <Upload className="w-4 h-4 text-rose-500" />
                            <span className="text-xs font-bold text-rose-700">Завантажити фото</span>
                            <input
                                type="file"
                                accept="image/*"
                                multiple
                                className="hidden"
                                onChange={handlePhotoUpload}
                            />
                        </label>
                    </div>
                </div>
            )}
        </div>
    )
}
