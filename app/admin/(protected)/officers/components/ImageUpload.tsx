'use client'

import { useState, useRef } from 'react'
import { X, Loader2, Image as ImageIcon } from 'lucide-react'
import { toast } from 'sonner'
import Image from 'next/image'

interface ImageUploadProps {
    value?: string | null
    onChange: (url: string | null) => void
}

export function ImageUpload({ value, onChange }: ImageUploadProps) {
    const [uploading, setUploading] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)

    const uploadFile = async (file: File) => {
        if (file.size > 5 * 1024 * 1024) {
            toast.error("Файл занадто великий (макс 5MB)")
            return
        }

        setUploading(true)
        const formData = new FormData()
        formData.append('file', file)

        try {
            const res = await fetch('/api/upload', {
                method: 'POST',
                body: formData
            })

            if (!res.ok) throw new Error('Upload failed')

            const data = await res.json()
            onChange(`/api/uploads/${data.id}.webp`)
            toast.success("Фото завантажено")
        } catch (error) {
            console.error("Upload error:", error)
            toast.error("Помилка завантаження фото")
        } finally {
            setUploading(false)
        }
    }

    const handleFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return
        await uploadFile(file)
        if (fileInputRef.current) {
            fileInputRef.current.value = ''
        }
    }

    return (
        <div className="space-y-4">
            {value ? (
                <div className="relative w-32 h-32 rounded-full overflow-hidden border-2 border-slate-200 group">
                    <Image
                        src={value}
                        alt="Preview"
                        fill
                        className="object-cover"
                        unoptimized
                    />
                    <button
                        onClick={() => onChange(null)}
                        type="button"
                        className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                        <X className="w-6 h-6 text-white" />
                    </button>
                </div>
            ) : (
                <div
                    onClick={() => fileInputRef.current?.click()}
                    className="w-32 h-32 rounded-full border-2 border-dashed border-slate-300 flex flex-col items-center justify-center cursor-pointer hover:border-slate-400 hover:bg-slate-50 transition-colors"
                >
                    {uploading ? (
                        <Loader2 className="w-8 h-8 text-slate-400 animate-spin" />
                    ) : (
                        <>
                            <ImageIcon className="w-8 h-8 text-slate-400 mb-2" />
                            <span className="text-xs text-slate-500 font-medium text-center px-2">Завантажити фото</span>
                        </>
                    )}
                </div>
            )}

            <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/*"
                onChange={handleFileInput}
            />
        </div>
    )
}
