import { prisma } from "@/lib/prisma"
import { notFound, redirect } from "next/navigation"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ArrowLeft, UserCog, History } from "lucide-react"
import Link from "next/link"
import UserEditForm from "./UserEditForm"
import UserAuditLog from "./UserAuditLog"
import { auth } from "@/auth"
import { detectPresetIdByPermissions, getRoleTitleByPermissions } from "@/lib/role-presets"

export default async function EditUserPage({
    params,
    searchParams
}: {
    params: Promise<{ id: string }>
    searchParams: Promise<{ tab?: string }>
}) {
    const session = await auth()
    const userRole = session?.user as any

    if (userRole?.role !== 'ADMIN' && !userRole?.permEditUsers && !userRole?.permManageUsers) {
        redirect("/admin/dashboard")
    }

    const { id } = await params
    const { tab } = await searchParams

    const user = await prisma.user.findUnique({
        where: { id }
    })

    if (!user) {
        notFound()
    }

    const rolePresetId = detectPresetIdByPermissions(user as any)
    const roleTitle = getRoleTitleByPermissions(user as any)
    const roleClass =
        rolePresetId === "ADMIN"
            ? "bg-purple-100 text-purple-700"
            : rolePresetId === "VIEW_ONLY"
                ? "bg-slate-100 text-slate-700"
                : "bg-blue-100 text-blue-700"

    return (
        <div className="max-w-4xl mx-auto space-y-8 pb-12">
            <div className="flex items-center gap-4">
                <Link href="/admin/users">
                    <Button variant="outline" size="icon" className="rounded-xl">
                        <ArrowLeft className="w-4 h-4" />
                    </Button>
                </Link>
                <div>
                    <h1 className="text-2xl font-black text-slate-900 uppercase italic">Профіль користувача</h1>
                    <p className="text-slate-500 text-sm font-medium">Керування даними та перегляд активності</p>
                </div>
            </div>

            <div className="flex items-center gap-6 p-6 bg-white rounded-[2rem] shadow-xl border border-slate-100">
                <div className="w-20 h-20 rounded-2xl bg-slate-900 flex items-center justify-center text-3xl font-black text-white shadow-lg shadow-slate-900/20">
                    {(user.lastName?.[0] || user.firstName?.[0] || user.username[0]).toUpperCase()}
                </div>
                <div>
                    <div className="flex items-center gap-3 mb-1">
                        <h2 className="text-2xl font-black text-slate-900">{user.lastName} {user.firstName}</h2>
                        {user.badgeNumber && (
                            <span className="px-2 py-1 rounded-lg bg-slate-100 text-xs font-black uppercase text-slate-500 border border-slate-200">
                                #{user.badgeNumber}
                            </span>
                        )}
                    </div>
                    <p className="text-slate-500 font-medium font-mono">{user.username} {user.email ? `(${user.email})` : ''}</p>
                </div>
                <div className="ml-auto">
                    <span className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest ${roleClass}`}>
                        {roleTitle}
                    </span>
                </div>
            </div>

            <Tabs defaultValue={tab || "edit"} className="w-full">
                <TabsList className="w-full h-14 p-1.5 bg-slate-100/50 rounded-2xl mb-8">
                    <TabsTrigger
                        value="edit"
                        className="flex-1 h-full rounded-xl text-xs font-black uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-lg transition-all gap-2"
                    >
                        <UserCog className="w-4 h-4" />
                        Редагування
                    </TabsTrigger>
                    <TabsTrigger
                        value="audit"
                        className="flex-1 h-full rounded-xl text-xs font-black uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-lg transition-all gap-2"
                    >
                        <History className="w-4 h-4" />
                        Історія дій
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="edit" className="focus-visible:outline-none animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <Card className="border-0 shadow-2xl ring-1 ring-slate-200 rounded-[2.5rem] overflow-hidden">
                        <CardHeader className="bg-slate-50/50 border-b p-8">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-primary rounded-2xl text-white shadow-lg shadow-primary/20">
                                    <UserCog className="w-6 h-6" />
                                </div>
                                <div>
                                    <CardTitle className="text-lg font-black uppercase tracking-tight">Налаштування доступу</CardTitle>
                                    <CardDescription>Оновіть дозволи або змініть пароль співробітника</CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="p-8">
                            <UserEditForm user={user} />
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="audit" className="focus-visible:outline-none animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <Card className="border-0 shadow-2xl ring-1 ring-slate-200 rounded-[2.5rem] overflow-hidden">
                        <CardHeader className="bg-slate-50/50 border-b p-8">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-blue-500 rounded-2xl text-white shadow-lg shadow-blue-500/20">
                                    <History className="w-6 h-6" />
                                </div>
                                <div>
                                    <CardTitle className="text-lg font-black uppercase tracking-tight">Журнал активності</CardTitle>
                                    <CardDescription>Історія дій користувача в системі</CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="p-8">
                            <UserAuditLog userId={user.id} />
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    )
}
