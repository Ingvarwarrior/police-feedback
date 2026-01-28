import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { FileText } from "lucide-react"
import ReportsList from "./ReportsList"

export default async function ReportsPage() {
    const session = await auth()
    if (!session?.user?.email) return null

    const [responses, users, currentUser] = await Promise.all([
        prisma.response.findMany({
            orderBy: { createdAt: 'desc' },
            include: {
                assignedTo: {
                    select: { id: true, email: true, firstName: true, lastName: true }
                },
                _count: {
                    select: { attachments: true }
                }
            }
        }),
        prisma.user.findMany({
            where: { active: true },
            select: { id: true, email: true, firstName: true, lastName: true }
        }),
        prisma.user.findUnique({
            where: { username: session.user.email as string },
            select: {
                role: true,
                username: true,
                permViewReports: true,
                permEditNotes: true,
                permChangeStatus: true,
                permExportData: true,
                permDeleteReports: true,
                permCreateOfficers: true,
                permEditOfficers: true,
                permDeleteOfficers: true,
                permEditCitizens: true,
                permDeleteCitizens: true,
                permViewAudit: true,
            }
        })
    ])

    return (
        <div className="space-y-8 pb-12">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black tracking-tight text-slate-900 uppercase italic">Реєстр відгуків</h1>
                    <p className="text-slate-500 font-medium tracking-tight">Повний перелік отриманих анкет громадян</p>
                </div>
            </div>

            <Card className="border-0 shadow-sm ring-1 ring-slate-200 rounded-[2.5rem] overflow-hidden">
                <CardHeader className="bg-slate-50/50 border-b px-8 py-6">
                    <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                        <FileText className="w-4 h-4 text-primary" />
                        Усі записи ({responses.length})
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-8">
                    <ReportsList initialResponses={responses} users={users} currentUser={currentUser} />
                </CardContent>
            </Card>
        </div>
    )
}
