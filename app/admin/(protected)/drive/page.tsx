import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { getFiles } from "./actions/driveActions"
import DriveClient from "./DriveClient"

export default async function DrivePage() {
    const session = await auth()
    if (!session?.user?.email) return null

    const user = await prisma.user.findUnique({
        where: { username: session.user.email as string },
        select: {
            role: true,
            permManageDrive: true
        }
    })

    const initialFiles = await getFiles()
    const canManage = user?.role === 'ADMIN' || !!user?.permManageDrive

    return (
        <div className="pb-12">
            <DriveClient initialFiles={initialFiles as any} canManage={canManage} />
        </div>
    )
}
