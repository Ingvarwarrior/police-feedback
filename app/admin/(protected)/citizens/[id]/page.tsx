import { prisma } from "@/lib/prisma"
import { notFound } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Phone, Star, Calendar, MessageSquare, ArrowLeft, Eye, Shield, MapPin, Info, Users, ExternalLink } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { formatPhoneNumberForCall, cn } from "@/lib/utils"
import CitizenEditForm from "./CitizenEditForm"
import DossierMapWrapper from "./DossierMapWrapper"
import { auth } from "@/auth"
import { checkPermission } from "@/lib/auth-utils"
import DeleteCitizenButton from "../DeleteCitizenButton"
import { calculateCitizenTags, getOfficerInteractions } from "@/lib/dossier-utils"
import CitizenMediaGallery from "./CitizenMediaGallery"
import OfficerInteractionCard from "./OfficerInteractionCard"
import AuditLogSection from "./AuditLogSection"
import DossierTabs from "./DossierTabs"
import { logDossierView } from "../actions/auditActions"

export default async function CitizenDossierPage({
    params
}: {
    params: Promise<{ id: string }>
}) {
    await checkPermission("permViewReports", true)
    const { id } = await params
    const session = await auth()
    const userPermissions = (session?.user as any) || {}
    const isAdmin = userPermissions.role === 'ADMIN'
    const canEdit = isAdmin || userPermissions.permEditCitizens
    const canDelete = isAdmin || userPermissions.permDeleteCitizens
    const canMarkSuspicious = isAdmin || userPermissions.permMarkSuspicious

    let citizen: any = null
    let errorInfo: string | null = null

    try {
        citizen = await (prisma.citizen as any).findUnique({
            where: { id },
            include: {
                phones: true,
                responses: {
                    include: {
                        geoPoint: true,
                        attachments: true,
                        taggedOfficers: true,
                        _count: {
                            select: { attachments: true }
                        }
                    },
                    orderBy: { createdAt: 'desc' }
                }
            }
        })
    } catch (error: any) {
        console.error("DIAGNOSTIC: DOSSIER ERROR", error)
        errorInfo = error.message
    }

    if (errorInfo) {
        return (
            <div className="p-10 bg-slate-900 text-white min-h-screen font-mono">
                <h1 className="text-xl font-bold text-rose-500 mb-4">Diagnostic: Dossier Error</h1>
                <pre className="bg-slate-800 p-6 rounded-2xl border border-rose-900/50 text-xs overflow-auto">
                    {errorInfo}
                </pre>
            </div>
        )
    }

    if (!citizen) {
        notFound()
    }

    // Log the view
    await logDossierView(citizen.id, citizen.fullName || citizen.phone || 'Anonymous')

    const responses = citizen.responses || []
    const tags = calculateCitizenTags(responses)
    const interactions = getOfficerInteractions(responses)

    const markers = responses
        .filter((r: any) => r?.geoPoint)
        .map((r: any) => ({
            lat: r.geoPoint.lat,
            lon: r.geoPoint.lon,
            title: r.districtOrCity || 'Звіт',
            description: `Оцінка: ${r.rateOverall}/5 - ${new Date(r.createdAt).toLocaleDateString()}`,
            id: r.id
        }))

    const avgRating = responses.length > 0
        ? responses.reduce((acc: number, r: any) => acc + (r.rateOverall || 0), 0) / responses.length
        : 0

    // History Content
    const historyView = (
        <div className="space-y-4">
            {responses.map((resp: any) => (
                <Link key={resp.id} href={`/admin/reports/${resp.id}`}>
                    <Card className="hover:border-primary transition-all group overflow-hidden border-slate-200">
                        <div className="flex flex-col sm:flex-row divide-y sm:divide-y-0 sm:divide-x divide-slate-100">
                            <div className="w-full sm:w-24 flex flex-col items-center justify-center p-6 bg-slate-50/50 group-hover:bg-primary/5 transition-colors">
                                <span className="text-3xl font-black text-primary">{resp.rateOverall || 0}</span>
                                <div className="flex gap-0.5 mt-1">
                                    {[...Array(5)].map((_, i) => (
                                        <Star key={i} className={`w-2 h-2 ${i < (resp.rateOverall || 0) ? 'fill-amber-500 text-amber-500' : 'text-slate-300'}`} />
                                    ))}
                                </div>
                            </div>
                            <div className="flex-1 p-6">
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] font-black uppercase bg-slate-100 px-2 py-1 rounded-md text-slate-500 group-hover:bg-primary/10 group-hover:text-primary transition-colors">#{resp.id.slice(-8).toUpperCase()}</span>
                                        <h3 className="font-bold text-slate-900">{resp.districtOrCity || 'Локація не вказана'}</h3>
                                    </div>
                                    <span className="text-[10px] font-bold text-slate-400 italic">
                                        {new Date(resp.createdAt).toLocaleDateString('uk-UA', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </div>
                                <p className="text-sm text-slate-500 line-clamp-2 italic mb-3">"{resp.comment || 'Без коментаря'}"</p>
                                <div className="flex items-center gap-4">
                                    <div className="flex items-center gap-1.5 text-[10px] font-black uppercase text-slate-400 tracking-wider">
                                        <Shield className="w-3 h-3" />
                                        {resp.status}
                                    </div>
                                    {resp._count.attachments > 0 && (
                                        <div className="flex items-center gap-1.5 text-[10px] font-black uppercase text-blue-500 tracking-wider">
                                            📸 {resp._count.attachments} МЕДІА
                                        </div>
                                    )}
                                    <div className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 text-primary font-black text-[10px] uppercase">
                                        Переглянути <Eye className="w-3 h-3" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </Card>
                </Link>
            ))}
            {responses.length === 0 && (
                <div className="p-20 text-center bg-slate-50 rounded-3xl border border-dashed border-slate-200">
                    <MessageSquare className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                    <p className="text-slate-400 font-bold uppercase tracking-widest text-sm">Звернень не знайдено</p>
                </div>
            )}
        </div>
    )

    // Analysis Content
    const analysisView = (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-6">
                <div>
                    <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-2">
                        <Users className="w-4 h-4" /> Взаємодія з екіпажами
                    </h3>
                    <OfficerInteractionCard interactions={interactions} />
                </div>
            </div>
            <div className="space-y-6">
                <div>
                    <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-2">
                        <Eye className="w-4 h-4" /> Журнал аудиту (Останні 20)
                    </h3>
                    <AuditLogSection citizenId={citizen.id} />
                </div>
            </div>
        </div>
    )

    return (
        <div className="space-y-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <Link href="/admin/citizens">
                        <Button variant="outline" size="icon" className="rounded-xl">
                            <ArrowLeft className="w-4 h-4" />
                        </Button>
                    </Link>
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-3xl font-black tracking-tight text-slate-900 uppercase italic">Досьє громадянина</h1>
                            {citizen.isVip && <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-[10px] font-black rounded uppercase tracking-widest border border-amber-200">VIP</span>}
                            {citizen.isSuspicious && <span className="px-2 py-0.5 bg-red-100 text-red-700 text-[10px] font-black rounded uppercase tracking-widest border border-red-200">Підозрілий</span>}
                        </div>
                        <p className="text-slate-500 font-medium">Керування профілем: {citizen.fullName || 'Анонім'}</p>
                    </div>
                </div>
                {isAdmin && <DeleteCitizenButton id={citizen.id} variant="outline" className="h-10 px-4 rounded-xl font-bold uppercase text-[10px] tracking-widest" />}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column: Core Identity & Bio-Tags */}
                <div className="space-y-6">
                    {/* Tags */}
                    {tags.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                            {tags.map(tag => (
                                <div key={tag.id} className={cn("px-3 py-1.5 rounded-xl border text-[10px] font-bold uppercase tracking-wide cursor-help transition-all hover:scale-105", tag.color)} title={tag.description}>
                                    {tag.label}
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                        <Card className="bg-primary/5 border-primary/20 shadow-sm">
                            <CardContent className="p-6 text-center">
                                <p className="text-[10px] font-black uppercase tracking-widest text-primary mb-1">Звітів</p>
                                <p className="text-4xl font-black text-primary">{responses.length}</p>
                            </CardContent>
                        </Card>
                        <Card className="bg-amber-50 border-amber-200 shadow-sm">
                            <CardContent className="p-6 text-center">
                                <p className="text-[10px] font-black uppercase tracking-widest text-amber-600 mb-1">Рейтинг</p>
                                <div className="flex items-center justify-center gap-2">
                                    <p className="text-4xl font-black text-amber-600">{avgRating.toFixed(1)}</p>
                                    <Star className="w-6 h-6 fill-amber-500 text-amber-500" />
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    <Card className="border-slate-200 shadow-sm overflow-hidden">
                        <CardHeader className="bg-slate-50/50 border-b py-4">
                            <CardTitle className="text-xs font-black uppercase tracking-widest text-slate-400">Контактні дані</CardTitle>
                        </CardHeader>
                        <CardContent className="p-6 space-y-5">
                            <div className="space-y-3">
                                {citizen.phone && (
                                    <div className="space-y-3">
                                        <a
                                            href={`tel:${formatPhoneNumberForCall(citizen.phone)}`}
                                            className="font-black text-primary flex items-center gap-2 bg-primary/5 px-4 py-3 rounded-2xl border border-primary/10 hover:bg-primary/10 transition-all text-lg shadow-sm"
                                        >
                                            <Phone className="w-5 h-5" />
                                            {citizen.phone}
                                        </a>
                                        {/* Communication Shortcuts */}
                                        <div className="grid grid-cols-2 gap-2">
                                            <a
                                                href={`viber://chat?number=${citizen.phone.replace('+', '')}`}
                                                className="flex items-center justify-center gap-2 py-2.5 bg-violet-50 text-violet-700 rounded-xl border border-violet-100 text-[10px] font-black uppercase tracking-widest hover:bg-violet-100 transition-colors"
                                            >
                                                Viber
                                            </a>
                                            <a
                                                href={`https://t.me/${citizen.phone.replace('+', '')}`}
                                                target="_blank"
                                                className="flex items-center justify-center gap-2 py-2.5 bg-sky-50 text-sky-700 rounded-xl border border-sky-100 text-[10px] font-black uppercase tracking-widest hover:bg-sky-100 transition-colors"
                                            >
                                                Telegram
                                            </a>
                                        </div>
                                    </div>
                                )}
                                <div className="space-y-1.5">
                                    {citizen.phones.filter((p: any) => p.phone !== citizen.phone).map((p: any) => (
                                        <a
                                            key={p.id}
                                            href={`tel:${formatPhoneNumberForCall(p.phone)}`}
                                            className="font-bold text-slate-600 bg-slate-50 px-3 py-2 rounded-xl border border-slate-100 text-sm flex items-center justify-between hover:bg-slate-100 transition-colors group"
                                        >
                                            <div className="flex items-center gap-2">
                                                <Phone className="w-3.5 h-3.5 text-slate-300" />
                                                {p.phone}
                                            </div>
                                            <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                                        </a>
                                    ))}
                                </div>
                            </div>
                            <div className="border-t pt-4">
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">IP Hash (Останній)</p>
                                <p className="font-mono text-[10px] text-slate-500 truncate bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                                    {citizen.ipHash || 'N/A'}
                                </p>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-slate-200 overflow-hidden shadow-sm">
                        <CardHeader className="bg-slate-50/50 border-b py-3 px-6">
                            <CardTitle className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                                <MapPin className="w-3.5 h-3.5" /> Активність на мапі
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0 h-[250px]">
                            <DossierMapWrapper markers={markers} />
                        </CardContent>
                    </Card>

                    {isAdmin && <CitizenEditForm citizen={citizen} canEdit={canEdit} canMarkSuspicious={canMarkSuspicious} />}
                </div>

                {/* Right Column: Tabbed Content */}
                <div className="lg:col-span-2 space-y-6">
                    <DossierTabs
                        history={historyView}
                        media={<CitizenMediaGallery responses={responses} />}
                        analysis={analysisView}
                        general={(
                            <div className="bg-slate-50 p-8 rounded-3xl border border-slate-200 border-dashed text-center">
                                <Info className="w-8 h-8 text-slate-300 mx-auto mb-3" />
                                <h3 className="text-sm font-black uppercase tracking-widest text-slate-500 mb-2">Профільна інформація</h3>
                                <p className="text-slate-400 text-xs italic">
                                    {citizen.internalNotes || "Внутрішні нотатки відсутні. Ви можете додати їх у формі редагування зліва."}
                                </p>
                            </div>
                        )}
                    />
                </div>
            </div>
        </div>
    )
}
