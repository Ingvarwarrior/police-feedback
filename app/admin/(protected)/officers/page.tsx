import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import OfficersList from "./OfficersList"

export default async function OfficersPage() {
    const session = await auth()
    if (!session?.user?.email) return null

    const currentUser = await prisma.user.findUnique({
        where: { username: session.user.email as string },
        select: {
            role: true,
            permCreateOfficers: true,
            permDeleteOfficers: true
        }
    })

    return <OfficersList currentUser={currentUser} />
}
