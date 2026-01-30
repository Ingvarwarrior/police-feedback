'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
    FileText,
    Image as ImageIcon,
    File as FileIcon,
    Download,
    Trash2,
    Plus,
    Search,
    HardDrive,
    Folder as FolderIcon,
    Loader2,
    FileCheck,
    ChevronRight,
    Home,
    Edit3,
    MoreVertical,
    Move,
    ArrowRight
} from 'lucide-react'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog"
import { deleteFile, renameFile, moveFile } from './actions/driveActions'
import { createFolder, renameFolder, deleteFolder, getFolders } from './actions/folderActions'
import { toast } from 'sonner'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

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

interface FolderItem {
    id: string
    name: string
    createdAt: Date
    createdBy: {
        firstName: string | null
        lastName: string | null
    }
}

interface Breadcrumb {
    id: string
    name: string
}

interface DriveClientProps {
    initialFiles: FileItem[]
    initialFolders: FolderItem[]
    breadcrumbs: Breadcrumb[]
    currentFolderId?: string
    canManage: boolean
}

const CATEGORIES = ["Всі", "Інструкції", "Накази", "Медіа", "Інше"]

export default function DriveClient({
    initialFiles,
    initialFolders,
    breadcrumbs,
    currentFolderId,
    canManage
}: DriveClientProps) {
    const router = useRouter()
    const [files, setFiles] = useState(initialFiles)
    const [folders, setFolders] = useState(initialFolders)
    const [search, setSearch] = useState('')
    const [category, setCategory] = useState('Всі')
    const [isUploading, setIsUploading] = useState(false)
    const [isDragOver, setIsDragOver] = useState(false)

    // Move Dialog State
    const [moveTarget, setMoveTarget] = useState<{ id: string, name: string, type: 'file' | 'folder' } | null>(null)
    const [availableFolders, setAvailableFolders] = useState<FolderItem[]>([])
    const [isLoadingFolders, setIsLoadingFolders] = useState(false)

    useEffect(() => {
        setFiles(initialFiles)
        setFolders(initialFolders)
    }, [initialFiles, initialFolders])

    const filteredFiles = files.filter(file => {
        const matchesSearch = file.name.toLowerCase().includes(search.toLowerCase())
        const matchesCategory = category === 'Всі' || file.category === category
        return matchesSearch && matchesCategory
    })

    const filteredFolders = folders.filter(folder =>
        folder.name.toLowerCase().includes(search.toLowerCase())
    )

    const uploadFile = async (file: File) => {
        setIsUploading(true)
        const formData = new FormData()
        formData.append('file', file)
        formData.append('category', category === 'Всі' ? 'Інше' : category)
        if (currentFolderId) formData.append('folderId', currentFolderId)

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
            toast.success(`Файл "${file.name}" завантажено`)
        } catch (error: any) {
            toast.error(error.message || 'Не вдалося завантажити файл')
        } finally {
            setIsUploading(false)
        }
    }

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return
        await uploadFile(file)
    }

    const onDrop = useCallback(async (e: React.DragEvent) => {
        e.preventDefault()
        setIsDragOver(false)
        const file = e.dataTransfer.files?.[0]
        if (file) await uploadFile(file)
    }, [currentFolderId, category])

    const handleCreateFolder = async () => {
        const name = prompt('Введіть назву папки:')
        if (!name) return

        try {
            const newFolder = await createFolder(name, currentFolderId)
            setFolders(prev => [newFolder as any, ...prev])
            toast.success('Папку створено')
        } catch (error) {
            toast.error('Помилка при створенні папки')
        }
    }

    const handleRename = async (id: string, currentName: string, type: 'file' | 'folder') => {
        const newName = prompt('Введіть нову назву:', currentName)
        if (!newName || newName === currentName) return

        try {
            if (type === 'file') {
                await renameFile(id, newName)
                setFiles(prev => prev.map(f => f.id === id ? { ...f, name: newName } : f))
            } else {
                await renameFolder(id, newName)
                setFolders(prev => prev.map(f => f.id === id ? { ...f, name: newName } : f))
            }
            toast.success('Перейменовано успішно')
        } catch (error) {
            toast.error('Помилка при перейменуванні')
        }
    }

    const handleMove = async (targetFolderId: string | null) => {
        if (!moveTarget) return
        try {
            if (moveTarget.type === 'file') {
                await moveFile(moveTarget.id, targetFolderId)
                setFiles(prev => prev.filter(f => f.id !== moveTarget.id))
            }
            toast.success('Переміщено успішно')
            setMoveTarget(null)
            router.refresh()
        } catch (error) {
            toast.error('Помилка при переміщенні')
        }
    }

    const openMoveDialog = async (item: { id: string, name: string, type: 'file' | 'folder' }) => {
        setMoveTarget(item)
        setIsLoadingFolders(true)
        try {
            // Fetch top-level folders or support deeper navigation in dialog?
            // For now, let's fetch folders for the dialog
            const folders = await getFolders()
            setAvailableFolders(folders as any)
        } catch (error) {
            toast.error('Не вдалося завантажити список папок')
        } finally {
            setIsLoadingFolders(false)
        }
    }

    const handleDeleteFile = async (id: string) => {
        if (!confirm('Ви впевнені, що хочете видалити цей файл?')) return
        try {
            await deleteFile(id)
            setFiles(prev => prev.filter(f => f.id !== id))
            toast.success('Файл видалено')
        } catch (error) {
            toast.error('Помилка при видаленні')
        }
    }

    const handleDeleteFolder = async (id: string) => {
        if (!confirm('Ви впевнені, що хочете видалити цю папку?')) return
        try {
            await deleteFolder(id)
            setFolders(prev => prev.filter(f => f.id !== id))
            toast.success('Папку видалено')
            router.refresh()
        } catch (error) {
            toast.error('Помилка при видаленні папки')
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
        <div
            className={`space-y-8 min-h-[60vh] transition-colors rounded-[3rem] p-4 ${isDragOver ? 'bg-blue-50/50 ring-4 ring-dashed ring-blue-200' : ''}`}
            onDragOver={(e) => { e.preventDefault(); setIsDragOver(true) }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={onDrop}
        >
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-blue-600 rounded-2xl text-white shadow-lg shadow-blue-200">
                        <HardDrive className="w-8 h-8" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-black uppercase tracking-tight text-slate-900 italic">Police Drive</h1>
                        <p className="text-slate-500 font-medium tracking-tight">Робоче сховище документів</p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className="relative group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                        <Input
                            placeholder="Пошук у сховищі..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-11 h-12 w-full md:w-64 rounded-2xl border-slate-200 bg-white/50 focus-visible:ring-blue-500 shadow-sm transition-all"
                        />
                    </div>

                    {canManage && (
                        <>
                            <Button
                                onClick={handleCreateFolder}
                                variant="outline"
                                className="h-12 px-6 rounded-2xl border-slate-200 font-bold uppercase text-[10px] tracking-widest gap-2"
                            >
                                <FolderIcon className="w-4 h-4" />
                                Папка
                            </Button>

                            <Label className="cursor-pointer">
                                <div className={`h-12 px-6 rounded-2xl bg-blue-600 text-white font-black uppercase text-xs tracking-widest flex items-center gap-2 shadow-lg shadow-blue-200 hover:scale-[1.02] active:scale-[0.98] transition-all ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}>
                                    {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                                    Завантажити
                                </div>
                                <input type="file" className="hidden" onChange={handleUpload} disabled={isUploading} />
                            </Label>
                        </>
                    )}
                </div>
            </div>

            {/* Breadcrumbs */}
            <nav className="flex items-center gap-2 text-sm font-medium text-slate-500 overflow-x-auto pb-2 no-scrollbar px-2">
                <Link
                    href="/admin/drive"
                    className={`flex items-center gap-1.5 hover:text-blue-600 transition-colors ${!currentFolderId ? 'text-blue-600 font-bold' : ''}`}
                >
                    <Home className="w-4 h-4" />
                    Мій Диск
                </Link>
                {breadcrumbs.map((crumb) => (
                    <div key={crumb.id} className="flex items-center gap-2 shrink-0">
                        <ChevronRight className="w-4 h-4 text-slate-300" />
                        <Link
                            href={`/admin/drive?folderId=${crumb.id}`}
                            className={`hover:text-blue-600 transition-colors ${currentFolderId === crumb.id ? 'text-blue-600 font-bold' : ''}`}
                        >
                            {crumb.name}
                        </Link>
                    </div>
                ))}
            </nav>

            {/* Category Filters */}
            <div className="flex items-center gap-2 overflow-x-auto pb-4 no-scrollbar px-2">
                {CATEGORIES.map(cat => (
                    <Button
                        key={cat}
                        variant={category === cat ? "default" : "ghost"}
                        onClick={() => setCategory(cat)}
                        className={`rounded-xl px-6 h-10 font-bold uppercase text-[10px] tracking-widest transition-all ${category === cat ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500 hover:bg-slate-100'}`}
                    >
                        {cat}
                    </Button>
                ))}
            </div>

            {/* Drag & Drop Overlay Info */}
            {isDragOver && (
                <div className="absolute inset-0 z-50 flex items-center justify-center pointer-events-none">
                    <div className="bg-white/90 backdrop-blur-sm p-12 rounded-[3rem] border-4 border-dashed border-blue-400 shadow-2xl flex flex-col items-center">
                        <Plus className="w-20 h-20 text-blue-500 mb-4 animate-bounce" />
                        <p className="text-2xl font-black uppercase tracking-wider text-blue-600 italic">Відпустіть для завантаження</p>
                    </div>
                </div>
            )}

            {/* Content Grid */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 px-2">
                {/* Folders */}
                {filteredFolders.map((folder) => (
                    <Card key={folder.id} className="group border-0 shadow-sm ring-1 ring-slate-200 rounded-3xl overflow-hidden hover:ring-blue-500/30 hover:shadow-xl hover:shadow-blue-500/5 transition-all">
                        <CardContent className="p-6">
                            <div className="flex items-start justify-between mb-4">
                                <Link href={`/admin/drive?folderId=${folder.id}`} className="p-3 bg-amber-50 rounded-2xl group-hover:bg-amber-100 transition-colors">
                                    <FolderIcon className="w-8 h-8 text-amber-500 fill-amber-500/20" />
                                </Link>

                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon" className="rounded-xl hover:bg-slate-100 h-10 w-10">
                                            <MoreVertical className="w-5 h-5 text-slate-400" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="rounded-2xl border-slate-100 shadow-xl p-2 w-48">
                                        <DropdownMenuItem
                                            onClick={() => handleRename(folder.id, folder.name, 'folder')}
                                            className="rounded-xl gap-2 font-bold text-xs uppercase p-3"
                                        >
                                            <Edit3 className="w-4 h-4 text-blue-500" />
                                            Перейменувати
                                        </DropdownMenuItem>
                                        <DropdownMenuItem
                                            onClick={() => handleDeleteFolder(folder.id)}
                                            className="rounded-xl gap-2 font-bold text-xs uppercase p-3 text-rose-600 focus:text-rose-600"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                            Видалити
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>

                            <Link href={`/admin/drive?folderId=${folder.id}`} className="block space-y-1">
                                <h3 className="font-bold text-slate-900 truncate pr-2">
                                    {folder.name}
                                </h3>
                                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-slate-400">
                                    <span>Папка</span>
                                    <span>•</span>
                                    <span>{new Date(folder.createdAt).toLocaleDateString('uk-UA')}</span>
                                </div>
                            </Link>
                        </CardContent>
                    </Card>
                ))}

                {/* Files */}
                {filteredFiles.map((file) => (
                    <Card key={file.id} className="group border-0 shadow-sm ring-1 ring-slate-200 rounded-3xl overflow-hidden hover:ring-blue-500/30 hover:shadow-xl hover:shadow-blue-500/5 transition-all">
                        <CardContent className="p-6">
                            <div className="flex items-start justify-between mb-4">
                                <div className="p-3 bg-slate-50 rounded-2xl group-hover:bg-blue-50 transition-colors">
                                    {getFileIcon(file.type)}
                                </div>

                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon" className="rounded-xl hover:bg-slate-100 h-10 w-10">
                                            <MoreVertical className="w-5 h-5 text-slate-400" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="rounded-2xl border-slate-100 shadow-xl p-2 w-48">
                                        <DropdownMenuItem className="rounded-xl gap-2 font-bold text-xs uppercase p-3" asChild>
                                            <a href={file.url} download={file.name} target="_blank" rel="noopener noreferrer">
                                                <Download className="w-4 h-4 text-blue-500" />
                                                Завантажити
                                            </a>
                                        </DropdownMenuItem>
                                        <DropdownMenuItem
                                            onClick={() => openMoveDialog({ id: file.id, name: file.name, type: 'file' })}
                                            className="rounded-xl gap-2 font-bold text-xs uppercase p-3"
                                        >
                                            <Move className="w-4 h-4 text-amber-500" />
                                            Перемістити
                                        </DropdownMenuItem>
                                        <DropdownMenuItem
                                            onClick={() => handleRename(file.id, file.name, 'file')}
                                            className="rounded-xl gap-2 font-bold text-xs uppercase p-3"
                                        >
                                            <Edit3 className="w-4 h-4 text-blue-500" />
                                            Перейменувати
                                        </DropdownMenuItem>
                                        <DropdownMenuItem
                                            onClick={() => handleDeleteFile(file.id)}
                                            className="rounded-xl gap-2 font-bold text-xs uppercase p-3 text-rose-600 focus:text-rose-600"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                            Видалити
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
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
                                <span className="flex items-center gap-1.5 shrink-0 truncate max-w-[120px]">
                                    {file.uploadedBy.lastName} {file.uploadedBy.firstName?.[0]}.
                                </span>
                                <span className="shrink-0">
                                    {new Date(file.createdAt).toLocaleDateString('uk-UA')}
                                </span>
                            </div>
                        </CardContent>
                    </Card>
                ))}

                {filteredFiles.length === 0 && filteredFolders.length === 0 && (
                    <div className="col-span-full py-20 flex flex-col items-center justify-center text-slate-400 bg-slate-50/50 rounded-[3rem] border-2 border-dashed border-slate-100 mt-4">
                        <FolderIcon className="w-16 h-16 mb-4 opacity-20" />
                        <p className="font-black uppercase tracking-[0.2em] text-xs">Тут порожньо</p>
                        <p className="text-[10px] mt-1 font-medium italic">Створіть папку або просто перетягніть файл сюди</p>
                    </div>
                )}
            </div>

            {/* Move Modal */}
            <Dialog open={!!moveTarget} onOpenChange={() => setMoveTarget(null)}>
                <DialogContent className="rounded-[2.5rem] border-0 shadow-2xl max-w-md">
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-black uppercase italic italic tracking-tight">Переміщення</DialogTitle>
                        <DialogDescription className="font-medium text-slate-500">
                            Виберіть куди перемістити <span className="text-slate-900 font-bold">"{moveTarget?.name}"</span>
                        </DialogDescription>
                    </DialogHeader>

                    <div className="py-4 space-y-2 max-h-[40vh] overflow-y-auto no-scrollbar">
                        <Button
                            variant="ghost"
                            className="w-full justify-start rounded-2xl h-14 font-bold text-sm gap-3 group"
                            onClick={() => handleMove(null)}
                        >
                            <Home className="w-5 h-5 text-blue-500 group-hover:scale-110 transition-transform" />
                            Мій Диск (Корінь)
                            <ArrowRight className="w-4 h-4 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                        </Button>

                        {isLoadingFolders ? (
                            <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-blue-500" /></div>
                        ) : availableFolders.map(folder => (
                            <Button
                                key={folder.id}
                                variant="ghost"
                                className="w-full justify-start rounded-2xl h-14 font-bold text-sm gap-3 group"
                                onClick={() => handleMove(folder.id)}
                            >
                                <FolderIcon className="w-5 h-5 text-amber-500 group-hover:scale-110 transition-transform" />
                                {folder.name}
                                <ArrowRight className="w-4 h-4 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                            </Button>
                        ))}
                    </div>

                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setMoveTarget(null)} className="rounded-xl font-bold uppercase text-[10px] tracking-widest text-slate-400 hover:text-slate-600">
                            Скасувати
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
