import { prisma } from "@/lib/prisma"
import { notFound } from "next/navigation"
import { auth } from "@/auth"
import { checkPermission, getCurrentUser } from "@/lib/auth-utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, MapPin, Calendar, Clock, User, Phone, Shield, MessageSquare, Image as ImageIcon, CheckCircle2, Eye } from "lucide-react"
import Link from "next/link"
import ReportMapWrapper from "./ReportMapWrapper"
import StatusControl from "./StatusControl"
import InternalNotes from "./InternalNotes"
import AssignmentControl from "./AssignmentControl"
import ReportResolution from "./ReportResolution"
import DeleteReportButton from "./DeleteReportButton"
import AddressResolver from "./AddressResolver"
import PrintButton from "./PrintButton"
import { formatPhoneNumberForCall } from "@/lib/utils"

export default async function ReportDetailPage({
    params,
    searchParams
}: {
    params: Promise<{ id: string }>,
    searchParams: Promise<{ from?: string }>
}) {
    await checkPermission("permViewReports", true)
    const userFromUtils = await getCurrentUser()
    const isAdmin = userFromUtils?.role === 'ADMIN'
    const canViewSensitive = isAdmin || userFromUtils?.permViewSensitiveData
    const { id } = await params
    const { from } = await searchParams
    const isFromMap = from === 'map'
    const backLink = isFromMap ? "/admin/map" : "/admin/reports"
    const backLabel = isFromMap ? "Мапа" : "Відгуки громадян"

    const response = await (prisma.response as any).findUnique({
        where: { id },
        include: {
            assignedTo: true,
            contact: true,
            geoPoint: true,
            attachments: true,
            taggedOfficers: true,
        }
    }) as any

    if (!response) {
        notFound()
    }

    const user = userFromUtils // Use the user from utils for the rest of the file

    // Permissions
    const canAssign = isAdmin || user?.permAssignReports
    const canChangeStatus = isAdmin || user?.permChangeStatus
    const canEditNotes = isAdmin || user?.permEditNotes
    const canDelete = isAdmin || user?.permDeleteReports

    return (
        <div className="space-y-8">
            {/* Breadcrumbs */}
            <div className="flex items-center gap-2 text-sm text-slate-500">
                <Link href="/admin/dashboard" className="hover:text-primary transition-colors">
                    Головна
                </Link>
                <span>/</span>
                <Link href={backLink} className="hover:text-primary transition-colors">
                    {backLabel}
                </Link>
                <span>/</span>
                <span className="text-slate-900 font-semibold">Деталі #{response.id.slice(-8).toUpperCase()}</span>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
                <div className="flex items-center gap-4">
                    <Link href={backLink}>
                        <Button variant="outline" size="icon">
                            <ArrowLeft className="w-4 h-4" />
                        </Button>
                    </Link>
                    <div className="flex-1">
                        <div className="flex items-center gap-3">
                            <h1 className="text-3xl font-bold tracking-tight text-slate-900">Деталі відгуку</h1>
                            {response.assignedTo && (
                                <div className="flex items-center gap-2 px-3 py-1 bg-blue-50 rounded-full border border-blue-200">
                                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                                    <span className="text-xs font-bold text-blue-700">
                                        {response.assignedTo.firstName || response.assignedTo.lastName
                                            ? `${response.assignedTo.firstName || ''} ${response.assignedTo.lastName || ''}`.trim()
                                            : response.assignedTo.email}
                                    </span>
                                </div>
                            )}
                        </div>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-slate-500 font-medium mt-1">
                            <p>ID: {response.id}</p>
                            <span className="hidden sm:inline text-slate-300">•</span>
                            <div className="flex items-center gap-1.5">
                                <Clock className="w-3.5 h-3.5" />
                                <span>Подано: {new Date(response.createdAt).toLocaleString('uk-UA', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                        </div>
                    </div>
                </div>
                <PrintButton />
            </div>

            {/* Print Only Header */}
            <div className="hidden print:block border-b-2 border-slate-900 pb-8 mb-8">
                <div className="flex justify-between items-start">
                    <div>
                        <h1 className="text-2xl font-black uppercase mb-1">Офіційний звіт про взаємодію</h1>
                        <p className="text-sm text-slate-500 italic">Система зворотного зв'язку «Патрульна поліція Хмільницького району»</p>
                    </div>
                    <div className="text-right">
                        <p className="font-bold">ID: {response.id.slice(-12).toUpperCase()}</p>
                        <p className="text-xs text-slate-400">Сформовано: {new Date().toLocaleString('uk-UA')}</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Content */}
                <div className="lg:col-span-2 space-y-6 sm:space-y-8">
                    {/* Basic Info */}
                    <Card className="border-slate-200 shadow-sm overflow-hidden">
                        <CardHeader className="bg-slate-50/50 border-b">
                            <CardTitle className="flex items-center gap-2 text-primary uppercase tracking-wider text-sm font-black">
                                <Shield className="w-4 h-4" />
                                Оцінка та Коментар
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6 pt-6">
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                {[
                                    { label: "Ввічливість", val: response.ratePoliteness },
                                    { label: "Професійність", val: response.rateProfessionalism },
                                    { label: "Ефективність", val: response.rateEffectiveness },
                                    { label: "Загалом", val: response.rateOverall },
                                ].map((item) => (
                                    <div key={item.label} className="bg-slate-50 p-4 rounded-2xl text-center border border-slate-100">
                                        <p className="text-[10px] text-slate-400 mb-1 font-black uppercase tracking-widest">{item.label}</p>
                                        <p className="text-2xl font-black text-primary">{item.val} <span className="text-sm text-yellow-500">★</span></p>
                                    </div>
                                ))}
                            </div>

                            <div className="bg-slate-50 p-5 sm:p-6 rounded-3xl border border-slate-100 relative">
                                <div className="absolute -top-3 left-6 px-3 py-1 bg-white border border-slate-100 rounded-full flex items-center gap-2 text-slate-400 font-black text-[10px] uppercase tracking-widest">
                                    <MessageSquare className="w-3 h-3" />
                                    Коментар
                                </div>
                                <p className="text-slate-900 leading-relaxed font-medium italic pt-2">
                                    "{response.comment || 'Коментар відсутній'}"
                                </p>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Media */}
                    {response.attachments.length > 0 && (
                        <Card className="border-slate-200 shadow-sm">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-sm font-black uppercase tracking-widest">
                                    <ImageIcon className="w-4 h-4 text-primary" />
                                    Прикріплені медіа ({response.attachments.length})
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                                    {response.attachments.map((file: any) => (
                                        <div key={file.id} className="aspect-square bg-slate-100 rounded-2xl overflow-hidden border border-slate-200 group relative shadow-inner">
                                            {file.mediaType === 'video' ? (
                                                <video
                                                    src={`/api/uploads/${file.pathOrKey}`}
                                                    controls
                                                    className="w-full h-full object-cover"
                                                />
                                            ) : (
                                                <a href={`/uploads/${file.pathOrKey}`} target="_blank" rel="noopener noreferrer">
                                                    <img
                                                        src={`/api/uploads/${file.pathOrKey}`}
                                                        alt="Attachment"
                                                        className="w-full h-full object-cover transition-transform group-hover:scale-110 cursor-zoom-in"
                                                    />
                                                </a>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Interaction Details */}
                    <Card className="border-slate-200 shadow-sm">
                        <CardHeader>
                            <CardTitle className="text-sm font-black uppercase tracking-widest">Обставини події</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid sm:grid-cols-2 gap-8">
                                <div className="space-y-6">
                                    <div className="flex items-start gap-4">
                                        <div className="p-2 bg-slate-100 rounded-xl text-slate-400">
                                            <Calendar className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1">Дата взаємодії</p>
                                            <p className="font-bold text-slate-900 text-lg">{response.interactionDate ? new Date(response.interactionDate).toLocaleDateString() : 'Не вказано'}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-4">
                                        <div className="p-2 bg-slate-100 rounded-xl text-slate-400">
                                            <Clock className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1">Приблизний час</p>
                                            <p className="font-bold text-slate-900 text-lg">{response.interactionTime || 'Не вказано'}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-4">
                                        <div className="p-2 bg-blue-50 rounded-xl text-blue-600">
                                            <CheckCircle2 className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1">Час подання відгуку</p>
                                            <p className="font-bold text-slate-900 text-lg">
                                                {new Date(response.createdAt).toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' })}
                                                <span className="text-sm text-slate-500 ml-2">({new Date(response.createdAt).toLocaleDateString()})</span>
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-4">
                                        <div className="p-2 bg-slate-100 rounded-xl text-slate-400">
                                            <Clock className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1">Час очікування</p>
                                            <p className="font-bold text-slate-900 text-lg">{response.responseTimeBucket || 'Не вказано'}</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="space-y-6">
                                    <div className="flex items-start gap-4">
                                        <div className="p-2 bg-slate-100 rounded-xl text-slate-400">
                                            <Shield className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1">Патруль / Жетон</p>
                                            <p className="font-bold text-slate-900 text-lg">{response.patrolRef || 'Не вказано'} {response.badgeNumber ? `(${response.badgeNumber})` : ''}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-4">
                                        <div className="p-2 bg-slate-100 rounded-xl text-slate-400">
                                            <User className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1">Офіцер</p>
                                            <p className="font-bold text-slate-900 text-lg">{response.officerName || 'Не вказано'}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Sidebar Info */}
                <div className="space-y-8">
                    {/* Administrative Actions */}
                    <Card className="border-slate-200 shadow-md">
                        <CardHeader className="bg-slate-50 border-b">
                            <CardTitle className="text-sm font-black uppercase tracking-widest text-primary flex items-center gap-2">
                                <Shield className="w-4 h-4" />
                                Робота за запитом
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-6 space-y-8">
                            <AssignmentControl
                                responseId={response.id}
                                currentAssigneeId={response.assignedToId}
                                canEdit={canAssign}
                            />

                            <div className="border-t pt-8">
                                <StatusControl
                                    id={response.id}
                                    currentStatus={response.status}
                                    canEdit={canChangeStatus}
                                />
                            </div>

                            <div className="border-t pt-6">
                                <InternalNotes
                                    id={response.id}
                                    initialNotes={response.internalNotes}
                                    canEdit={canEditNotes}
                                />
                            </div>

                            {canDelete && (
                                <div className="border-t pt-2">
                                    <DeleteReportButton id={response.id} />
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Contact Info */}
                    {response.contact && (
                        <Card className="border-emerald-200 shadow-sm bg-emerald-50/30">
                            <CardHeader>
                                <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                                    <Phone className="w-4 h-4 text-emerald-600" />
                                    Контактна інформація
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-[10px] text-slate-400 mb-1 font-black uppercase tracking-widest">Ім'я</p>
                                        <p className="text-slate-900 font-bold">
                                            {canViewSensitive ? (response.contact.name || 'Не вказано') : '*** ***'}
                                        </p>
                                    </div>
                                    <Link
                                        href={response.citizenId ? `/admin/citizens/${response.citizenId}` : `/admin/citizens?q=${encodeURIComponent(response.contact.phone)}`}
                                        className="inline-flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-primary hover:border-primary transition-all shadow-sm"
                                    >
                                        <Eye className="w-3.5 h-3.5" />
                                        Досьє
                                    </Link>
                                </div>
                                <div>
                                    <p className="text-[10px] text-slate-400 mb-2 font-black uppercase tracking-widest">Телефон</p>
                                    {canViewSensitive ? (
                                        <a
                                            href={`tel:${formatPhoneNumberForCall(response.contact.phone)}`}
                                            className="w-full inline-flex justify-center items-center gap-3 px-6 py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-2xl shadow-lg shadow-emerald-500/30 transition-all hover:scale-105 text-lg"
                                        >
                                            <Phone className="w-5 h-5" />
                                            {response.contact.phone}
                                        </a>
                                    ) : (
                                        <div className="w-full inline-flex justify-center items-center gap-3 px-6 py-4 bg-slate-100 text-slate-400 font-black rounded-2xl border-2 border-dashed border-slate-200 cursor-not-allowed">
                                            <Phone className="w-5 h-5 opacity-50" />
                                            +380 ** *** ** **
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Resolution Section (For assigned user or admin) */}
                    {
                        (response.status === 'ASSIGNED' || response.status === 'RESOLVED') && (
                            <ReportResolution
                                responseId={response.id}
                                initialNotes={response.resolutionNotes}
                                initialCategory={response.incidentCategory}
                                initialTaggedOfficers={response.taggedOfficers || []}
                                initialIsConfirmed={response.isConfirmed}
                                canEdit={
                                    response.status !== 'RESOLVED' &&
                                    (isAdmin || (response.assignedToId === user?.id && canChangeStatus))
                                }
                            />
                        )
                    }

                    {/* Location */}
                    <Card className="overflow-hidden border-slate-200 shadow-sm">
                        <CardHeader className="bg-slate-50/50 border-b">
                            <CardTitle className="flex items-center gap-2 text-sm font-black uppercase tracking-widest">
                                <MapPin className="w-4 h-4 text-primary" />
                                Геолокація
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            {response.geoPoint ? (
                                <div className="space-y-0">
                                    <div className="h-[350px] w-full bg-slate-100 shadow-inner">
                                        <ReportMapWrapper lat={response.geoPoint.lat} lon={response.geoPoint.lon} />
                                    </div>
                                    <div className="p-5 space-y-2 bg-white">
                                        <div className="flex justify-between items-end">
                                            <div>
                                                <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1">
                                                    {response.geoPoint.precisionMode === 'approx' ? 'Приблизні координати' : 'Точні координати'}
                                                </p>
                                                <p className="font-mono text-[11px] bg-slate-50 p-2 rounded-lg border border-slate-100">
                                                    {response.geoPoint.lat.toFixed(6)}, {response.geoPoint.lon.toFixed(6)}
                                                </p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1">Точність</p>
                                                <p className="font-bold text-slate-900">{response.geoPoint.accuracyMeters?.toFixed(1) || '?'}м</p>
                                            </div>
                                        </div>
                                        <AddressResolver lat={response.geoPoint.lat} lon={response.geoPoint.lon} />
                                    </div>
                                </div>
                            ) : (
                                <div className="p-12 text-center text-slate-400 italic text-sm">Локація не надана</div>
                            )}
                        </CardContent>
                    </Card>

                    {/* System Info */}
                    <div className="p-5 sm:p-6 bg-slate-50 rounded-3xl border border-slate-200 text-[10px] text-slate-400 space-y-2 font-medium">
                        <div className="flex justify-between">
                            <span className="uppercase tracking-widest">Створено</span>
                            <span className="text-slate-600">{new Date(response.createdAt).toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="uppercase tracking-widest">User Agent</span>
                            <span className="text-slate-600 truncate max-w-[150px]">{response.userAgent}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="uppercase tracking-widest">IP Hash</span>
                            <div className="flex items-center gap-3">
                                <Link
                                    href={response.citizenId ? `/admin/citizens/${response.citizenId}` : `/admin/citizens?q=${encodeURIComponent(response.ipHash)}`}
                                    className="text-primary font-bold hover:underline"
                                >
                                    {response.ipHash || 'N/A'}
                                </Link>
                                <Link
                                    href={response.citizenId ? `/admin/citizens/${response.citizenId}` : (response.contact ? `/admin/citizens?q=${encodeURIComponent(response.contact.phone)}` : `/admin/citizens?q=${encodeURIComponent(response.ipHash)}`)}
                                    className="p-1 px-3 bg-white border border-slate-200 rounded-lg text-slate-400 hover:text-primary hover:border-primary transition-all text-[9px] font-black uppercase tracking-widest flex items-center gap-2 shadow-sm"
                                    title="Досьє"
                                >
                                    <Eye className="w-3 h-3" />
                                    Досьє
                                </Link>
                            </div>
                        </div>
                        {response.suspicious && (
                            <div className="pt-2 flex items-center gap-2 text-red-600 font-black uppercase tracking-widest underline decoration-2 underline-offset-4">
                                <Shield className="w-3 h-3" />
                                ПІДОЗРІЛА АКТИВНІСТЬ
                            </div>
                        )}
                    </div>
                </div >
            </div >
        </div >
    )
}
