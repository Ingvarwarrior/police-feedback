import { prisma } from "@/lib/prisma"
import { notFound } from "next/navigation"
import { auth } from "@/auth"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Shield, Phone, Globe, Calendar, Star, Eye, ArrowLeft } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export default async function CitizenDossierPage({
    params
}: {
    params: Promise<{ id: string }>
}) {
    const { id } = await params
    const decodedId = decodeURIComponent(id)

    // Check if ID is a phone number or IP Hash
    // We search for responses by contact phone OR ipHash
    const responses = await prisma.response.findMany({
        where: {
            OR: [
                { contact: { phone: decodedId } },
                { ipHash: decodedId }
            ]
        },
        include: {
            contact: true,
            _count: {
                select: { attachments: true }
            }
        },
        orderBy: { createdAt: 'desc' }
    })

    if (responses.length === 0) {
        notFound()
    }

    const firstReport = responses[responses.length - 1]
    const avgRating = responses.reduce((acc, r) => acc + (r.rateOverall || 0), 0) / responses.length
    const isPhone = responses.some(r => r.contact?.phone === decodedId)

    return (
        <div className="space-y-8">
            <div className="flex items-center gap-4">
                <Link href="/admin/reports">
                    <Button variant="outline" size="icon">
                        <ArrowLeft className="w-4 h-4" />
                    </Button>
                </Link>
                <div>
                    <h1 className="text-3xl font-black tracking-tight text-slate-900 uppercase">Досьє громадянина</h1>
                    <p className="text-slate-500 font-medium">{isPhone ? `Телефон: ${decodedId}` : `IP Hash: ${decodedId}`}</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="border-primary/20 shadow-lg bg-primary/5">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-[10px] font-black uppercase tracking-widest text-primary">Усього звітів</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-4xl font-black text-primary">{responses.length}</p>
                    </CardContent>
                </Card>
                <Card className="border-amber-200 shadow-lg bg-amber-50/50">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-[10px] font-black uppercase tracking-widest text-amber-600">Сер. оцінка</CardTitle>
                    </CardHeader>
                    <CardContent className="flex items-center gap-2">
                        <p className="text-4xl font-black text-amber-600">{avgRating.toFixed(1)}</p>
                        <Star className="w-6 h-6 fill-amber-500 text-amber-500" />
                    </CardContent>
                </Card>
                <Card className="border-blue-200 shadow-lg bg-blue-50/50">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-[10px] font-black uppercase tracking-widest text-blue-600">Перша поява</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-xl font-black text-blue-600">{new Date(firstReport.createdAt).toLocaleDateString('uk-UA')}</p>
                    </CardContent>
                </Card>
            </div>

            <div className="space-y-4">
                <h2 className="text-xl font-black uppercase tracking-tight flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-primary" />
                    Історія звернень
                </h2>

                <div className="grid gap-4">
                    {responses.map((resp) => (
                        <Link key={resp.id} href={`/admin/reports/${resp.id}`}>
                            <Card className="hover:border-primary transition-all group overflow-hidden">
                                <CardContent className="p-0">
                                    <div className="flex items-center p-6 gap-6">
                                        <div className="flex flex-col items-center justify-center bg-slate-50 w-20 h-20 rounded-2xl border border-slate-100 shrink-0">
                                            <span className="text-2xl font-black text-primary">{resp.rateOverall}</span>
                                            <span className="text-[8px] font-black uppercase text-slate-400 tracking-tighter">Оцінка</span>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between mb-1">
                                                <h3 className="font-bold text-slate-900 truncate">{resp.districtOrCity || 'Локація не вказана'}</h3>
                                                <span className="text-[10px] font-bold text-slate-400">{new Date(resp.createdAt).toLocaleString('uk-UA')}</span>
                                            </div>
                                            <p className="text-sm text-slate-500 line-clamp-1 italic">"{resp.comment || 'Без коментаря'}"</p>
                                            <div className="flex gap-2 mt-2">
                                                <span className="text-[9px] font-black uppercase bg-slate-100 px-2 py-1 rounded text-slate-500">{resp.status}</span>
                                                {resp._count.attachments > 0 && (
                                                    <span className="text-[9px] font-black uppercase bg-blue-50 px-2 py-1 rounded text-blue-600">📸 {resp._count.attachments} медіа</span>
                                                )}
                                            </div>
                                        </div>
                                        <Button variant="ghost" size="icon" className="group-hover:bg-primary group-hover:text-white transition-colors">
                                            <Eye className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        </Link>
                    ))}
                </div>
            </div>
        </div>
    )
}
