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
            <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 transition-colors duration-300">
                <Link href="/admin/dashboard" className="hover:text-primary dark:hover:text-blue-400 transition-colors">
                    Головна
                </Link>
                <span>/</span>
                <Link href={backLink} className="hover:text-primary dark:hover:text-blue-400 transition-colors">
                    {backLabel}
                </Link>
                <span>/</span>
                <span className="text-slate-900 dark:text-white font-semibold transition-colors duration-300">Деталі #{response.id.slice(-8).toUpperCase()}</span>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
                <div className="flex items-center gap-4">
                    <Link href={backLink}>
                        <Button variant="outline" size="icon" className="dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-700">
                            <ArrowLeft className="w-4 h-4" />
                        </Button>
                    </Link>
                    <div className="flex-1">
                        <div className="flex items-center gap-3">
                            <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white transition-colors duration-300">Деталі відгуку</h1>
                            {response.assignedTo && (
                                <div className="flex items-center gap-2 px-3 py-1 bg-blue-50 dark:bg-blue-900/30 rounded-full border border-blue-200 dark:border-blue-800 transition-colors duration-300">
                                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                                    <span className="text-xs font-bold text-blue-700 dark:text-blue-300">
                                        {response.assignedTo.firstName || response.assignedTo.lastName
                                            ? `${response.assignedTo.firstName || ''} ${response.assignedTo.lastName || ''}`.trim()
                                            : response.assignedTo.email}
                                    </span>
                                </div>
                            )}
                        </div>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-slate-500 dark:text-slate-400 font-medium mt-1 transition-colors duration-300">
                            <p>ID: {response.id}</p>
                            <span className="hidden sm:inline text-slate-300 dark:text-slate-600">•</span>
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
                    <Card className="border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden bg-white dark:bg-slate-900 transition-colors duration-300">
                        <CardHeader className="bg-slate-50/50 dark:bg-slate-800/50 border-b dark:border-slate-800 transition-colors duration-300">
                            <CardTitle className="flex items-center gap-2 text-primary dark:text-blue-400 uppercase tracking-wider text-sm font-black transition-colors duration-300">
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
                                    <div key={item.label} className="bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl text-center border border-slate-100 dark:border-slate-700 transition-colors duration-300">
                                        <p className="text-[10px] text-slate-400 dark:text-slate-500 mb-1 font-black uppercase tracking-widest transition-colors duration-300">{item.label}</p>
                                        <p className="text-2xl font-black text-primary dark:text-blue-400 transition-colors duration-300">{item.val} <span className="text-sm text-yellow-500">★</span></p>
                                    </div>
                                ))}
                            </div>

                            <div className="bg-slate-50 dark:bg-slate-800 p-5 sm:p-6 rounded-3xl border border-slate-100 dark:border-slate-700 relative transition-colors duration-300">
                                <div className="absolute -top-3 left-6 px-3 py-1 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-700 rounded-full flex items-center gap-2 text-slate-400 dark:text-slate-500 font-black text-[10px] uppercase tracking-widest transition-colors duration-300">
                                    <MessageSquare className="w-3 h-3" />
                                    Коментар
                                </div>
                                <p className="text-slate-900 dark:text-white leading-relaxed font-medium italic pt-2 transition-colors duration-300">
                                    "{response.comment || 'Коментар відсутній'}"
                                </p>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Media */}
                    {response.attachments.length > 0 && (
                        <Card className="border-slate-200 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900 transition-colors duration-300">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-sm font-black uppercase tracking-widest text-slate-900 dark:text-white transition-colors duration-300">
                                    <ImageIcon className="w-4 h-4 text-primary dark:text-blue-400" />
                                    Прикріплені медіа ({response.attachments.length})
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                                    {response.attachments.map((file: any) => (
                                        <div key={file.id} className="aspect-square bg-slate-100 dark:bg-slate-800 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 group relative shadow-inner transition-colors duration-300">
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
                    <Card className="border-slate-200 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900 transition-colors duration-300">
                        <CardHeader>
                            <CardTitle className="text-sm font-black uppercase tracking-widest text-slate-900 dark:text-white transition-colors duration-300">Обставини події</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid sm:grid-cols-2 gap-8">
                                <div className="space-y-6">
                                    <div className="flex items-start gap-4">
                                        <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-xl text-slate-400 dark:text-slate-500 transition-colors duration-300">
                                            <Calendar className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <p className="text-[10px] text-slate-400 dark:text-slate-500 font-black uppercase tracking-widest mb-1 transition-colors duration-300">Дата взаємодії</p>
                                            <p className="font-bold text-slate-900 dark:text-white text-lg transition-colors duration-300">{response.interactionDate ? new Date(response.interactionDate).toLocaleDateString() : 'Не вказано'}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-4">
                                        <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-xl text-slate-400 dark:text-slate-500 transition-colors duration-300">
                                            <Clock className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <p className="text-[10px] text-slate-400 dark:text-slate-500 font-black uppercase tracking-widest mb-1 transition-colors duration-300">Приблизний час</p>
                                            <p className="font-bold text-slate-900 dark:text-white text-lg transition-colors duration-300">{response.interactionTime || 'Не вказано'}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-4">
                                        <div className="p-2 bg-blue-50 dark:bg-blue-900/30 rounded-xl text-blue-600 dark:text-blue-400 transition-colors duration-300">
                                            <CheckCircle2 className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <p className="text-[10px] text-slate-400 dark:text-slate-500 font-black uppercase tracking-widest mb-1 transition-colors duration-300">Час подання відгуку</p>
                                            <p className="font-bold text-slate-900 dark:text-white text-lg transition-colors duration-300">
                                                {new Date(response.createdAt).toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' })}
                                                <span className="text-sm text-slate-500 dark:text-slate-400 ml-2">({new Date(response.createdAt).toLocaleDateString()})</span>
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-4">
                                        <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-xl text-slate-400 dark:text-slate-500 transition-colors duration-300">
                                            <Clock className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <p className="text-[10px] text-slate-400 dark:text-slate-500 font-black uppercase tracking-widest mb-1 transition-colors duration-300">Час очікування</p>
                                            <p className="font-bold text-slate-900 dark:text-white text-lg transition-colors duration-300">{response.responseTimeBucket || 'Не вказано'}</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="space-y-6">
                                    <div className="flex items-start gap-4">
                                        <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-xl text-slate-400 dark:text-slate-500 transition-colors duration-300">
                                            <Shield className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <p className="text-[10px] text-slate-400 dark:text-slate-500 font-black uppercase tracking-widest mb-1 transition-colors duration-300">Патруль / Жетон</p>
                                            <p className="font-bold text-slate-900 dark:text-white text-lg transition-colors duration-300">{response.patrolRef || 'Не вказано'} {response.badgeNumber ? `(${response.badgeNumber})` : ''}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-4">
                                        <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-xl text-slate-400 dark:text-slate-500 transition-colors duration-300">
                                            <User className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <p className="text-[10px] text-slate-400 dark:text-slate-500 font-black uppercase tracking-widest mb-1 transition-colors duration-300">Офіцер</p>
                                            <p className="font-bold text-slate-900 dark:text-white text-lg transition-colors duration-300">{response.officerName || 'Не вказано'}</p>
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
                    <Card className="border-slate-200 dark:border-slate-800 shadow-md bg-white dark:bg-slate-900 transition-colors duration-300">
                        <CardHeader className="bg-slate-50 dark:bg-slate-800 border-b dark:border-slate-800 transition-colors duration-300">
                            <CardTitle className="text-sm font-black uppercase tracking-widest text-primary dark:text-blue-400 flex items-center gap-2 transition-colors duration-300">
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

                            <div className="border-t border-slate-100 dark:border-slate-800 pt-8 transition-colors duration-300">
                                <StatusControl
                                    id={response.id}
                                    currentStatus={response.status}
                                    canEdit={canChangeStatus}
                                />
                            </div>

                            <div className="border-t border-slate-100 dark:border-slate-800 pt-6 transition-colors duration-300">
                                <InternalNotes
                                    id={response.id}
                                    initialNotes={response.internalNotes}
                                    canEdit={canEditNotes}
                                />
                            </div>

                            {canDelete && (
                                <div className="border-t border-slate-100 dark:border-slate-800 pt-2 transition-colors duration-300">
                                    <DeleteReportButton id={response.id} />
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Contact Info */}
                    {response.contact && (
                        <Card className="border-emerald-200 dark:border-emerald-900/30 shadow-sm bg-emerald-50/30 dark:bg-emerald-900/10 transition-colors duration-300">
                            <CardHeader>
                                <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2 text-slate-900 dark:text-emerald-400 transition-colors duration-300">
                                    <Phone className="w-4 h-4 text-emerald-600 dark:text-emerald-500" />
                                    Контактна інформація
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-[10px] text-slate-400 dark:text-slate-500 mb-1 font-black uppercase tracking-widest transition-colors duration-300">Ім'я</p>
                                        <p className="text-slate-900 dark:text-emerald-100 font-bold transition-colors duration-300">
                                            {canViewSensitive ? (response.contact.name || 'Не вказано') : '*** ***'}
                                        </p>
                                    </div>
                                    <Link
                                        href={response.citizenId ? `/admin/citizens/${response.citizenId}` : `/admin/citizens?q=${encodeURIComponent(response.contact.phone)}`}
                                        className="inline-flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 hover:text-primary dark:hover:text-emerald-400 hover:border-primary dark:hover:border-emerald-400 transition-all shadow-sm"
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
                                        <div className="w-full inline-flex justify-center items-center gap-3 px-6 py-4 bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 font-black rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700 cursor-not-allowed transition-colors duration-300">
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
                    <Card className="overflow-hidden border-slate-200 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900 transition-colors duration-300">
                        <CardHeader className="bg-slate-50/50 dark:bg-slate-800/50 border-b dark:border-slate-800 transition-colors duration-300">
                            <CardTitle className="flex items-center gap-2 text-sm font-black uppercase tracking-widest text-slate-900 dark:text-white transition-colors duration-300">
                                <MapPin className="w-4 h-4 text-primary dark:text-blue-400" />
                                Геолокація
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            {response.geoPoint ? (
                                <div className="space-y-0">
                                    <div className="h-[350px] w-full bg-slate-100 dark:bg-slate-800 shadow-inner transition-colors duration-300">
                                        <ReportMapWrapper lat={response.geoPoint.lat} lon={response.geoPoint.lon} />
                                    </div>
                                    <div className="p-5 space-y-2 bg-white dark:bg-slate-900 transition-colors duration-300">
                                        <div className="flex justify-between items-end">
                                            <div>
                                                <p className="text-[10px] text-slate-400 dark:text-slate-500 font-black uppercase tracking-widest mb-1 transition-colors duration-300">
                                                    {response.geoPoint.precisionMode === 'approx' ? 'Приблизні координати' : 'Точні координати'}
                                                </p>
                                                <p className="font-mono text-[11px] bg-slate-50 dark:bg-slate-800 p-2 rounded-lg border border-slate-100 dark:border-slate-700 text-slate-900 dark:text-slate-200 transition-colors duration-300">
                                                    {response.geoPoint.lat.toFixed(6)}, {response.geoPoint.lon.toFixed(6)}
                                                </p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-[10px] text-slate-400 dark:text-slate-500 font-black uppercase tracking-widest mb-1 transition-colors duration-300">Точність</p>
                                                <p className="font-bold text-slate-900 dark:text-white transition-colors duration-300">{response.geoPoint.accuracyMeters?.toFixed(1) || '?'}м</p>
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
                    <div className="p-5 sm:p-6 bg-slate-50 dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 text-[10px] text-slate-400 dark:text-slate-500 space-y-2 font-medium transition-colors duration-300">
                        <div className="flex justify-between">
                            <span className="uppercase tracking-widest">Створено</span>
                            <span className="text-slate-600 dark:text-slate-300">{new Date(response.createdAt).toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="uppercase tracking-widest">User Agent</span>
                            <span className="text-slate-600 dark:text-slate-300 truncate max-w-[150px]">{response.userAgent}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="uppercase tracking-widest">IP Hash</span>
                            <div className="flex items-center gap-3">
                                <Link
                                    href={response.citizenId ? `/admin/citizens/${response.citizenId}` : `/admin/citizens?q=${encodeURIComponent(response.ipHash)}`}
                                    className="text-primary dark:text-blue-400 font-bold hover:underline transition-colors duration-300"
                                >
                                    {response.ipHash || 'N/A'}
                                </Link>
                                <Link
                                    href={response.citizenId ? `/admin/citizens/${response.citizenId}` : (response.contact ? `/admin/citizens?q=${encodeURIComponent(response.contact.phone)}` : `/admin/citizens?q=${encodeURIComponent(response.ipHash)}`)}
                                    className="p-1 px-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-400 dark:text-slate-500 hover:text-primary dark:hover:text-blue-400 hover:border-primary dark:hover:border-blue-400 transition-all text-[9px] font-black uppercase tracking-widest flex items-center gap-2 shadow-sm"
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
