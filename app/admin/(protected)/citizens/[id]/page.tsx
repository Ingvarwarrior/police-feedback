import { prisma } from "@/lib/prisma"
import { notFound } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Phone, Star, Calendar, MessageSquare, ArrowLeft, Eye, Shield, MapPin } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { formatPhoneNumberForCall } from "@/lib/utils"
import CitizenEditForm from "./CitizenEditForm"
import DossierMapWrapper from "./DossierMapWrapper"
import { auth } from "@/auth"
import DeleteCitizenButton from "../DeleteCitizenButton"

export default async function CitizenDossierPage({
    params
}: {
    params: Promise<{ id: string }>
}) {
    const { id } = await params
    const session = await auth()
    const userPermissions = (session?.user as any) || {}
    const isAdmin = userPermissions.role === 'ADMIN'
    const canEdit = isAdmin || userPermissions.permEditCitizens
    const canDelete = isAdmin || userPermissions.permDeleteCitizens

    let citizen: any = null
    let errorInfo: string | null = null

    try {
        citizen = await prisma.citizen.findUnique({
            where: { id },
            include: {
                phones: true,
                responses: {
                    include: {
                        geoPoint: true,
                        _count: {
                            select: { attachments: true }
                        }
                    },
                    orderBy: { createdAt: 'desc' }
                }
            }
        })
    } catch (error: any) {
        console.error("CRITICAL ERROR FETCHING CITIZEN DOSSIER:", error)
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

    const markers = (citizen?.responses || [])
        .filter((r: any) => r?.geoPoint)
        .map((r: any) => ({
            lat: r.geoPoint.lat,
            lon: r.geoPoint.lon,
            title: r.districtOrCity || 'Звіт',
            description: `Оцінка: ${r.rateOverall}/5 - ${new Date(r.createdAt).toLocaleDateString()}`,
            id: r.id
        }))

    const avgRating = (citizen?.responses?.length || 0) > 0
        ? citizen.responses.reduce((acc: number, r: any) => acc + (r.rateOverall || 0), 0) / citizen.responses.length
        : 0

    return (
        <div className="space-y-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 no-print">
                <div className="flex items-center gap-4">
                    <Link href="/admin/citizens">
                        <Button variant="outline" size="icon" className="rounded-xl">
                            <ArrowLeft className="w-4 h-4" />
                        </Button>
                    </Link>
                    {canDelete && citizen && <DeleteCitizenButton id={citizen.id} variant="outline" className="h-10 w-10 rounded-xl" />}
                    <div>
                        <h1 className="text-3xl font-black tracking-tight text-slate-900 uppercase italic">Досьє громадянина</h1>
                        <p className="text-slate-500 font-medium whitespace-nowrap overflow-hidden text-ellipsis max-w-[400px]">Керування профілем: {citizen?.fullName || 'Анонім'}</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column: Stats & Meta */}
                <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                        <Card className="bg-primary/5 border-primary/20 shadow-sm">
                            <CardContent className="p-6 text-center">
                                <p className="text-[10px] font-black uppercase tracking-widest text-primary mb-1">Звітів</p>
                                <p className="text-4xl font-black text-primary">{citizen?.responses?.length || 0}</p>
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

                    <Card className="border-slate-200">
                        <CardContent className="p-6 space-y-4">
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Підключені телефони</p>
                                <div className="space-y-1.5">
                                    {citizen?.phone && (
                                        <a
                                            href={`tel:${formatPhoneNumberForCall(citizen.phone)}`}
                                            className="font-black text-primary flex items-center gap-2 bg-primary/5 px-3 py-2 rounded-xl border border-primary/10 hover:bg-primary/10 transition-colors"
                                        >
                                            <Phone className="w-4 h-4" />
                                            {citizen.phone}
                                        </a>
                                    )}
                                    {(citizen?.phones || []).filter((p: any) => p?.phone !== citizen?.phone).map((p: any) => (
                                        <a
                                            key={p?.id || Math.random()}
                                            href={`tel:${formatPhoneNumberForCall(p?.phone)}`}
                                            className="font-bold text-slate-600 bg-slate-50 px-3 py-2 rounded-xl border border-slate-100 text-sm flex items-center gap-2 hover:bg-slate-100 transition-colors"
                                        >
                                            <Phone className="w-3.5 h-3.5 text-slate-300" />
                                            {p?.phone || 'Unknown'}
                                        </a>
                                    ))}
                                </div>
                            </div>
                            <div className="border-t pt-4">
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">IP Hash (Останній)</p>
                                <p className="font-mono text-xs text-slate-500 truncate bg-slate-50 p-2 rounded-lg border">
                                    {citizen?.ipHash || 'N/A'}
                                </p>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-slate-200 overflow-hidden shadow-xl">
                        <CardHeader className="bg-slate-50 border-b py-3 px-6">
                            <CardTitle className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                                <MapPin className="w-3.5 h-3.5" /> Активність на мапі
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0 h-[250px]">
                            <DossierMapWrapper markers={markers} />
                        </CardContent>
                    </Card>

                    {citizen && <CitizenEditForm citizen={citizen} canEdit={canEdit} />}
                </div>

                {/* Right Column: History */}
                <div className="lg:col-span-2 space-y-6">
                    <h2 className="text-xl font-black uppercase tracking-tight flex items-center gap-2 px-1">
                        <Calendar className="w-5 h-5 text-primary" />
                        Історія звернень ({citizen?.responses?.length || 0})
                    </h2>

                    <div className="space-y-4">
                        {(citizen?.responses || []).map((resp: any) => (
                            <Link key={resp?.id || Math.random()} href={`/admin/reports/${resp?.id}`}>
                                <Card className="hover:border-primary transition-all group overflow-hidden border-slate-200">
                                    <div className="flex flex-col sm:flex-row divide-y sm:divide-y-0 sm:divide-x divide-slate-100">
                                        <div className="w-full sm:w-24 flex flex-col items-center justify-center p-6 bg-slate-50/50 group-hover:bg-primary/5 transition-colors">
                                            <span className="text-3xl font-black text-primary">{resp?.rateOverall || 0}</span>
                                            <div className="flex gap-0.5 mt-1">
                                                {[...Array(5)].map((_, i) => (
                                                    <Star key={i} className={`w-2 h-2 ${i < (resp?.rateOverall || 0) ? 'fill-amber-500 text-amber-500' : 'text-slate-300'}`} />
                                                ))}
                                            </div>
                                        </div>
                                        <div className="flex-1 p-6">
                                            <div className="flex items-center justify-between mb-2">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[10px] font-black uppercase bg-slate-100 px-2 py-1 rounded-md text-slate-500 group-hover:bg-primary/10 group-hover:text-primary transition-colors">#{resp?.id?.slice(-8).toUpperCase() || '????'}</span>
                                                    <h3 className="font-bold text-slate-900">{resp?.districtOrCity || 'Локація не вказана'}</h3>
                                                </div>
                                                <span className="text-[10px] font-bold text-slate-400 italic">
                                                    {resp?.createdAt ? new Date(resp.createdAt).toLocaleDateString('uk-UA', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '---'}
                                                </span>
                                            </div>
                                            <p className="text-sm text-slate-500 line-clamp-2 italic mb-3">"{resp?.comment || 'Без коментаря'}"</p>
                                            <div className="flex items-center gap-4">
                                                <div className="flex items-center gap-1.5 text-[10px] font-black uppercase text-slate-400 tracking-wider">
                                                    <Shield className="w-3 h-3" />
                                                    {resp?.status || 'NEW'}
                                                </div>
                                                {(resp?._count?.attachments || 0) > 0 && (
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

                        {(!citizen?.responses || citizen.responses.length === 0) && (
                            <div className="p-20 text-center bg-slate-50 rounded-3xl border border-dashed border-slate-200">
                                <MessageSquare className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                                <p className="text-slate-400 font-bold uppercase tracking-widest text-sm">Звернень не знайдено</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
