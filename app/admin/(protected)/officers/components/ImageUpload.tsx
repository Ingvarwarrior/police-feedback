'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Upload, X, Loader2, Image as ImageIcon, Camera } from 'lucide-react'
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
            // Important: Use /api/uploads/ to go through our server-side serving logic
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

    const [showCamera, setShowCamera] = useState(false)
    const videoRef = useRef<HTMLVideoElement>(null)
    const [stream, setStream] = useState<MediaStream | null>(null)

    useEffect(() => {
        if (showCamera && stream && videoRef.current) {
            videoRef.current.srcObject = stream
        }
    }, [showCamera, stream])

    const startCamera = async () => {
        try {
            // Request the rear camera specifically
            const mediaStream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment' }
            })
            setStream(mediaStream)
            setShowCamera(true)
        } catch (error) {
            console.error("Camera error:", error)
            // Fallback to any camera if environment camera fails
            try {
                const fallbackStream = await navigator.mediaDevices.getUserMedia({ video: true })
                setStream(fallbackStream)
                setShowCamera(true)
            } catch (innerError) {
                toast.error("Не вдалося отримати доступ до камери")
            }
        }
    }

    const stopCamera = () => {
        if (stream) {
            stream.getTracks().forEach(track => track.stop())
            setStream(null)
        }
        setShowCamera(false)
    }

    const capturePhoto = () => {
        if (!videoRef.current) return

        const canvas = document.createElement('canvas')
        canvas.width = videoRef.current.videoWidth
        canvas.height = videoRef.current.videoHeight
        const ctx = canvas.getContext('2d')
        if (!ctx) return

        ctx.drawImage(videoRef.current, 0, 0)
        canvas.toBlob(async (blob) => {
            if (blob) {
                const file = new File([blob], `capture-${Date.now()}.jpg`, { type: "image/jpeg" })
                await uploadFile(file)
                stopCamera()
            }
        }, 'image/jpeg', 0.9)
    }

    return (
        <div className="space-y-4">
            {showCamera ? (
                <div className="relative w-full max-w-sm aspect-video bg-black rounded-lg overflow-hidden">
                    <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        className="w-full h-full object-cover"
                    />
                    <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-4">
                        <Button variant="destructive" size="sm" onClick={stopCamera}>
                            Скасувати
                        </Button>
                        <Button size="sm" onClick={capturePhoto}>
                            Зробити фото
                        </Button>
                    </div>
                </div>
            ) : value ? (
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
                <div className="flex gap-4">
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
                    <div
                        onClick={startCamera}
                        className="w-32 h-32 rounded-full border-2 border-dashed border-slate-300 flex flex-col items-center justify-center cursor-pointer hover:border-slate-400 hover:bg-slate-50 transition-colors"
                    >
                        <Camera className="w-8 h-8 text-slate-400 mb-2" />
                        <span className="text-xs text-slate-500 font-medium text-center px-2">Зробити фото</span>
                    </div>
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
