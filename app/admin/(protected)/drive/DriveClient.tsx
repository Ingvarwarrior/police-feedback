'use client'

import { useState, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
    FileText,
    Image as ImageIcon,
    File as FileIcon,
    MoreVertical,
    Download,
    Trash2,
    Plus,
    Search,
    HardDrive,
    Folder,
    ExternalLink,
    Loader2,
    FileCheck
} from 'lucide-react'
import { deleteFile } from './actions/driveActions'
import { toast } from 'sonner'

interface FileItem {
    id: string
    name: string
    type: string
    size: number
    url: string
    category: string
    createdAt: Date
    uploadedBy: {
        firstName: string | null
        lastName: string | null
        username: string
    }
}

interface DriveClientProps {
    initialFiles: FileItem[]
    canManage: boolean
}

const CATEGORIES = ["Всі", "Інструкції", "Накази", "Медіа", "Інше"]

export default function DriveClient({ initialFiles, canManage }: DriveClientProps) {
    const [files, setFiles] = useState(initialFiles)
    const [search, setSearch] = useState('')
    const [category, setCategory] = useState('Всі')
    const [isUploading, setIsUploading] = useState(false)

    const filteredFiles = files.filter(file => {
        const matchesSearch = file.name.toLowerCase().includes(search.toLowerCase())
        const matchesCategory = category === 'Всі' || file.category === category
        return matchesSearch && matchesCategory
    })

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        setIsUploading(true)
        const formData = new FormData()
        formData.append('file', file)
        formData.append('category', category === 'Всі' ? 'Інше' : category)

        try {
            const res = await fetch('/api/admin/drive/upload', {
                method: 'POST',
                body: formData
            })

            if (!res.ok) {
                const errorData = await res.json()
                throw new Error(errorData.error || 'Помилка завантаження')
            }

            const newFile = await res.json()
            setFiles(prev => [newFile, ...prev])
            toast.success('Файл завантажено успішно')
        } catch (error: any) {
            toast.error(error.message || 'Не вдалося завантажити файл')
            console.error('Upload catch:', error)
        } finally {
            setIsUploading(false)
        }
    }

    const handleDelete = async (id: string) => {
        if (!confirm('Ви впевнені, що хочете видалити цей файл?')) return

        try {
            await deleteFile(id)
            setFiles(prev => prev.filter(f => f.id !== id))
            toast.success('Файл видалено')
        } catch (error) {
            toast.error('Помилка при видаленні')
        }
    }

    const formatSize = (bytes: number) => {
        if (bytes === 0) return '0 B'
        const k = 1024
        const sizes = ['B', 'KB', 'MB', 'GB']
        const i = Math.floor(Math.log(bytes) / Math.log(k))
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
    }

    const getFileIcon = (type: string) => {
        if (type.includes('image')) return <ImageIcon className="w-8 h-8 text-blue-500" />
        if (type.includes('pdf')) return <FileCheck className="w-8 h-8 text-rose-500" />
        if (type.includes('word') || type.includes('text')) return <FileText className="w-8 h-8 text-indigo-500" />
        return <FileIcon className="w-8 h-8 text-slate-400" />
    }

    return (
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-blue-600 rounded-2xl text-white shadow-lg shadow-blue-200">
                        <HardDrive className="w-8 h-8" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-black uppercase tracking-tight text-slate-900 italic">Police Drive</h1>
                        <p className="text-slate-500 font-medium tracking-tight">Внутрішнє сховище службових документів</p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className="relative group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                        <Input
                            placeholder="Пошук файлів..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-11 h-12 w-full md:w-64 rounded-2xl border-slate-200 bg-white/50 focus-visible:ring-blue-500 shadow-sm transition-all"
                        />
                    </div>

                    <Label className="cursor-pointer">
                        <div className={`h-12 px-6 rounded-2xl bg-blue-600 text-white font-black uppercase text-xs tracking-widest flex items-center gap-2 shadow-lg shadow-blue-200 hover:scale-[1.02] active:scale-[0.98] transition-all ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}>
                            {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                            Завантажити
                        </div>
                        <input type="file" className="hidden" onChange={handleUpload} disabled={isUploading} />
                    </Label>
                </div>
            </div>

            <div className="flex items-center gap-2 overflow-x-auto pb-4 no-scrollbar">
                {CATEGORIES.map(cat => (
                    <Button
                        key={cat}
                        variant={category === cat ? "default" : "ghost"}
                        onClick={() => setCategory(cat)}
                        className={`rounded-xl px-6 h-10 font-bold uppercase text-[10px] tracking-widest transition-all ${category === cat ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500 hover:bg-slate-100'}`}
                    >
                        {cat === "Всі" ? <Folder className="w-3 h-3 mr-2" /> : null}
                        {cat}
                    </Button>
                ))}
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {filteredFiles.map((file) => (
                    <Card key={file.id} className="group border-0 shadow-sm ring-1 ring-slate-200 rounded-3xl overflow-hidden hover:ring-blue-500/30 hover:shadow-xl hover:shadow-blue-500/5 transition-all">
                        <CardContent className="p-6">
                            <div className="flex items-start justify-between mb-4">
                                <div className="p-3 bg-slate-50 rounded-2xl group-hover:bg-blue-50 transition-colors">
                                    {getFileIcon(file.type)}
                                </div>
                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <a
                                        href={file.url}
                                        download={file.name}
                                        className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                                        title="Завантажити"
                                    >
                                        <Download className="w-4 h-4" />
                                    </a>
                                    {canManage && (
                                        <button
                                            onClick={() => handleDelete(file.id)}
                                            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                                            title="Видалити"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                            </div>

                            <div className="space-y-1">
                                <h3 className="font-bold text-slate-900 truncate pr-2" title={file.name}>
                                    {file.name}
                                </h3>
                                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-slate-400">
                                    <span>{file.category}</span>
                                    <span>•</span>
                                    <span>{formatSize(file.size)}</span>
                                </div>
                            </div>

                            <div className="mt-6 pt-4 border-t border-slate-50 flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase">
                                <span className="flex items-center gap-1.5">
                                    <Plus className="w-3 h-3" />
                                    {file.uploadedBy.lastName} {file.uploadedBy.firstName?.[0]}.
                                </span>
                                <span>
                                    {new Date(file.createdAt).toLocaleDateString('uk-UA')}
                                </span>
                            </div>
                        </CardContent>
                    </Card>
                ))}

                {filteredFiles.length === 0 && (
                    <div className="col-span-full py-20 flex flex-col items-center justify-center text-slate-400 bg-slate-50/50 rounded-[3rem] border-2 border-dashed border-slate-100 mt-4">
                        <Folder className="w-16 h-16 mb-4 opacity-20" />
                        <p className="font-black uppercase tracking-[0.2em] text-xs">Файлів не знайдено</p>
                        <p className="text-[10px] mt-1 font-medium italic">Спробуйте змінити фільтри або завантажити новий файл</p>
                    </div>
                )}
            </div>
        </div>
    )
}
