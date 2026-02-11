import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { checkPermission } from "@/lib/auth-utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { FileText } from "lucide-react"
import ReportsList from "./ReportsList"

export default async function ReportsPage() {
    await checkPermission("permViewReports", true)
    const session = await auth()
    const email = session?.user?.email
    if (!email) return null

    const where: any = {}
    // Previously limited to assigned only, now open to all inspectors


    const [responses, users, currentUser] = await Promise.all([
        prisma.response.findMany({
            where,
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
            where: { username: email },
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
                permViewSensitiveData: true,
                permViewOfficerStats: true,
            }
        })
    ])

    return (
        <div className="space-y-8 pb-12">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white uppercase italic transition-colors duration-300">Відгуки громадян</h1>
                    <p className="text-slate-500 dark:text-slate-400 font-medium tracking-tight transition-colors duration-300">Повний перелік отриманих анкет громадян</p>
                </div>
            </div>

            <Card className="border-0 shadow-sm ring-1 ring-slate-200 dark:ring-slate-800 rounded-[2.5rem] overflow-hidden bg-white dark:bg-slate-900 transition-colors duration-300">
                <CardHeader className="bg-slate-50/50 dark:bg-slate-800/50 border-b dark:border-slate-800 px-8 py-6 transition-colors duration-300">
                    <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2 text-slate-900 dark:text-slate-200">
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
