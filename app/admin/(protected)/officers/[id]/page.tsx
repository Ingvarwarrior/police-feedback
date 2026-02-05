import { auth } from "@/auth"
import OfficerDetail from "./OfficerDetail"

export default async function OfficerDetailPage({
    params,
}: {
    params: Promise<{ id: string }>
}) {
    // Resolve params properly in Next.js 15+
    const resolvedParams = await params
    const session = await auth()
    const user = session?.user as any
    const canViewStats = user?.role === 'ADMIN' || !!user?.permViewOfficerStats
    const canExport = user?.role === 'ADMIN' || !!user?.permExportData
    const canEdit = user?.role === 'ADMIN' || !!user?.permEditOfficers
    const canEvaluate = user?.role === 'ADMIN' || !!user?.permCreateEvaluations
    const canDelete = user?.role === 'ADMIN' || !!user?.permDeleteOfficers

    return (
        <OfficerDetail
            officerId={resolvedParams.id}
            userRole={user?.role || 'USER'}
            canViewStats={canViewStats}
            canExport={canExport}
            canEdit={canEdit}
            canEvaluate={canEvaluate}
            canDelete={canDelete}
        />
    )
}
