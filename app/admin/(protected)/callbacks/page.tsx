import { PhoneCall, Shield, Info } from "lucide-react"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { getCallbackReferenceData, getCallbacks } from "./actions/callbackActions"
import CallbackList from "./components/CallbackList"

export default async function CallbacksPage() {
  const session = await auth()
  if (!session?.user?.email) return null

  const userPerms = session.user as any
  if (userPerms.role !== "ADMIN" && !userPerms.permViewReports) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center space-y-4">
        <div className="rounded-full bg-red-50 p-4 text-red-500">
          <Shield className="h-12 w-12" />
        </div>
        <h1 className="text-2xl font-black uppercase italic tracking-tighter">Доступ обмежено</h1>
        <p className="max-w-xs text-center text-slate-500">
          У вас немає прав для перегляду callback-карток. Зверніться до адміністратора.
        </p>
      </div>
    )
  }

  const [callbacks, refs, currentUser] = await Promise.all([
    getCallbacks(),
    getCallbackReferenceData(),
    prisma.user.findUnique({
      where: { username: session.user.email },
      select: {
        id: true,
        role: true,
        firstName: true,
        lastName: true,
        username: true,
        permAssignReports: true,
        permChangeStatus: true,
      },
    }),
  ])

  if (!currentUser) return null

  return (
    <div className="space-y-8 pb-10">
      <div className="relative overflow-hidden rounded-[3rem] bg-slate-900 p-8 text-white shadow-2xl md:p-12">
        <div className="absolute right-0 top-0 rotate-12 p-12 opacity-10">
          <PhoneCall className="h-48 w-48" />
        </div>

        <div className="relative z-10 space-y-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-blue-500/20 p-2">
              <PhoneCall className="h-6 w-6 text-blue-400" />
            </div>
            <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-400/80">Контроль якості</h2>
          </div>
          <h1 className="text-4xl font-black leading-none tracking-tight md:text-5xl">
            Callback-картки <br />
            <span className="text-blue-400">оцінювання нарядів</span>
          </h1>
          <p className="max-w-2xl text-sm font-medium text-slate-400">
            Інспектор фіксує дані виклику, заявника, поліцейських і результати телефонного опитування для оцінки роботи наряду.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3 rounded-3xl border border-blue-100 bg-blue-50/50 p-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white text-blue-600 shadow-sm">
          <Info className="h-5 w-5" />
        </div>
        <p className="text-xs font-medium text-slate-600">
          У картці callback є список питань для опитування заявника. Натисніть на картку в списку, щоб відкрити повну деталізацію.
        </p>
      </div>

      <CallbackList
        initialCallbacks={callbacks as any[]}
        officers={refs.officers}
        canDelete={currentUser.role === "ADMIN"}
        canProcess={currentUser.role === "ADMIN" || !!currentUser.permAssignReports || !!currentUser.permChangeStatus}
      />
    </div>
  )
}
