'use client'

import { CardContent } from "@/components/ui/card"
import { Image as ImageIcon, Film, ExternalLink } from "lucide-react"

interface CitizenMediaGalleryProps {
    responses: any[]
}

export default function CitizenMediaGallery({ responses }: CitizenMediaGalleryProps) {
    const allAttachments = responses.flatMap(r =>
        r.attachments.map((a: any) => ({ ...a, reportId: r.id, createdAt: r.createdAt }))
    ).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

    if (allAttachments.length === 0) {
        return (
            <div className="p-20 text-center bg-slate-50 rounded-3xl border border-dashed border-slate-200">
                <ImageIcon className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-400 font-bold uppercase tracking-widest text-sm">Медіа-файлів не знайдено</p>
            </div>
        )
    }

    return (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {allAttachments.map((file) => (
                <div key={file.id} className="group relative aspect-square bg-slate-100 rounded-2xl overflow-hidden border border-slate-200 shadow-sm transition-all hover:shadow-md">
                    {file.mediaType === 'video' ? (
                        <div className="w-full h-full flex items-center justify-center bg-slate-900 text-white">
                            <Film className="w-8 h-8 opacity-50" />
                            <video
                                src={`/api/uploads/${file.pathOrKey}`}
                                className="absolute inset-0 w-full h-full object-cover opacity-60"
                            />
                        </div>
                    ) : (
                        <img
                            src={`/api/uploads/${file.pathOrKey}`}
                            alt="Citizen attachment"
                            className="w-full h-full object-cover transition-transform group-hover:scale-105"
                        />
                    )}

                    {/* Overlay with report link */}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 p-2">
                        <a
                            href={`/api/uploads/${file.pathOrKey}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 bg-white rounded-full text-slate-900 hover:scale-110 transition-transform"
                        >
                            <ExternalLink className="w-4 h-4" />
                        </a>
                        <span className="text-[9px] font-black text-white uppercase tracking-widest">
                            {new Date(file.createdAt).toLocaleDateString()}
                        </span>
                    </div>
                </div>
            ))}
        </div>
    )
}
