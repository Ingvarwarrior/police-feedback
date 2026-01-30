import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { getFiles } from "./actions/driveActions"
import { getFolders, getFolderBreadcrumbs } from "./actions/folderActions"
import DriveClient from "./DriveClient"

export default async function DrivePage({
    searchParams
}: {
    searchParams: { folderId?: string }
}) {
    const session = await auth()
    if (!session?.user?.email) return null

    const folderId = searchParams.folderId

    const user = await prisma.user.findUnique({
        where: { username: session.user.email as string },
        select: {
            role: true,
            permManageDrive: true
        }
    })

    const [initialFiles, initialFolders, breadcrumbs] = await Promise.all([
        getFiles(folderId),
        getFolders(folderId),
        folderId ? getFolderBreadcrumbs(folderId) : Promise.resolve([])
    ])

    const canManage = user?.role === 'ADMIN' || !!user?.permManageDrive

    return (
        <div className="pb-12">
            <DriveClient
                initialFiles={initialFiles as any}
                initialFolders={initialFolders as any}
                breadcrumbs={breadcrumbs as any}
                currentFolderId={folderId}
                canManage={canManage}
            />
        </div>
    )
}
