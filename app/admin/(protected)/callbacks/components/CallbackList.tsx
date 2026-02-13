'use client'

import { useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Search, User, Phone, Calendar, Users, ClipboardCheck } from "lucide-react"
import { format } from "date-fns"
import { uk } from "date-fns/locale"
import CreateCallbackDialog from "./CreateCallbackDialog"

interface OfficerRow {
  id: string
  firstName: string | null
  lastName: string | null
  badgeNumber: string
  rank: string | null
  department: string | null
}

interface UserRow {
  id: string
  firstName: string | null
  lastName: string | null
  username: string
}

interface CallbackRow {
  id: string
  callDate: string | Date
  eoNumber: string
  applicantName: string
  applicantPhone: string
  status: string
  qPoliteness: number | null
  qProfessionalism: number | null
  qLawfulness: number | null
  qResponseSpeed: number | null
  qHelpfulness: number | null
  qOverall: number | null
  surveyNotes: string | null
  officers: OfficerRow[]
  assignedUser: UserRow | null
  createdBy: UserRow | null
}

interface Props {
  initialCallbacks: CallbackRow[]
  officers: OfficerRow[]
  users: UserRow[]
  currentUser: {
    id: string
    role: string
  }
}

function userLabel(user: UserRow | null) {
  if (!user) return "Не призначено"
  return `${user.lastName || ""} ${user.firstName || ""}`.trim() || user.username
}

function scoreLabel(value: number | null | undefined) {
  return value ? `${value}/5` : "—"
}

export default function CallbackList({ initialCallbacks, officers, users, currentUser }: Props) {
  const [search, setSearch] = useState("")
  const [status, setStatus] = useState<"ALL" | "PENDING" | "COMPLETED">("ALL")

  const filtered = useMemo(() => {
    let data = [...initialCallbacks]

    if (status !== "ALL") {
      data = data.filter((cb) => cb.status === status)
    }

    if (search.trim()) {
      const q = search.toLowerCase().trim()
      data = data.filter((cb) => {
        const officersString = cb.officers
          .map((o) => `${o.lastName || ""} ${o.firstName || ""} ${o.badgeNumber}`.toLowerCase())
          .join(" ")
        return (
          cb.eoNumber.toLowerCase().includes(q) ||
          cb.applicantName.toLowerCase().includes(q) ||
          cb.applicantPhone.toLowerCase().includes(q) ||
          officersString.includes(q)
        )
      })
    }

    return data.sort((a, b) => new Date(b.callDate).getTime() - new Date(a.callDate).getTime())
  }, [initialCallbacks, search, status])

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 rounded-[2rem] border border-slate-200 bg-white/90 p-3 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-12 rounded-xl pl-9"
            placeholder="Пошук за № ЄО, заявником, телефоном або поліцейським"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setStatus("ALL")}
            className={`rounded-xl px-4 py-2 text-xs font-black uppercase tracking-widest ${status === "ALL" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-500"}`}
          >
            Всі
          </button>
          <button
            onClick={() => setStatus("PENDING")}
            className={`rounded-xl px-4 py-2 text-xs font-black uppercase tracking-widest ${status === "PENDING" ? "bg-amber-600 text-white" : "bg-slate-100 text-slate-500"}`}
          >
            Очікує
          </button>
          <button
            onClick={() => setStatus("COMPLETED")}
            className={`rounded-xl px-4 py-2 text-xs font-black uppercase tracking-widest ${status === "COMPLETED" ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-500"}`}
          >
            Завершено
          </button>
          {(currentUser.role === "ADMIN" || users.length > 0) && <CreateCallbackDialog officers={officers} users={users} />}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Card className="rounded-3xl border-slate-200">
          <CardContent className="p-5">
            <p className="text-xs font-black uppercase tracking-widest text-slate-400">Всього callback</p>
            <p className="mt-2 text-3xl font-black text-slate-900">{filtered.length}</p>
          </CardContent>
        </Card>
        <Card className="rounded-3xl border-slate-200">
          <CardContent className="p-5">
            <p className="text-xs font-black uppercase tracking-widest text-slate-400">Очікують опитування</p>
            <p className="mt-2 text-3xl font-black text-amber-600">{filtered.filter((cb) => cb.status === "PENDING").length}</p>
          </CardContent>
        </Card>
        <Card className="rounded-3xl border-slate-200">
          <CardContent className="p-5">
            <p className="text-xs font-black uppercase tracking-widest text-slate-400">Завершені</p>
            <p className="mt-2 text-3xl font-black text-emerald-600">{filtered.filter((cb) => cb.status === "COMPLETED").length}</p>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        {filtered.map((cb) => (
          <Card key={cb.id} className="overflow-hidden rounded-[2rem] border-slate-200">
            <CardHeader className="border-b border-slate-100 bg-slate-50/50 p-5">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="space-y-1">
                  <CardTitle className="text-lg font-black uppercase italic tracking-tight">Callback №{cb.eoNumber}</CardTitle>
                  <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-slate-500">
                    <span className="inline-flex items-center gap-1"><Calendar className="h-3.5 w-3.5" />{format(new Date(cb.callDate), "dd MMMM yyyy", { locale: uk })}</span>
                    <span className="inline-flex items-center gap-1"><User className="h-3.5 w-3.5" />{cb.applicantName}</span>
                    <span className="inline-flex items-center gap-1"><Phone className="h-3.5 w-3.5" />{cb.applicantPhone}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`inline-flex rounded-xl px-3 py-1 text-xs font-black uppercase tracking-widest ${cb.status === "COMPLETED" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                    {cb.status === "COMPLETED" ? "Завершено" : "Очікує"}
                  </span>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-4 p-5">
              <div>
                <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-slate-400">Поліцейські, яких стосується</p>
                <div className="flex flex-wrap gap-2">
                  {cb.officers.length === 0 && <span className="text-sm text-slate-400">Не вказано</span>}
                  {cb.officers.map((o) => (
                    <span key={o.id} className="inline-flex rounded-xl border border-slate-200 px-3 py-1 text-xs font-bold text-slate-700">
                      <Users className="mr-1 h-3 w-3" />
                      {`${o.lastName || ""} ${o.firstName || ""}`.trim()} ({o.badgeNumber})
                    </span>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Ввічливість</p>
                  <p className="text-sm font-black text-slate-900">{scoreLabel(cb.qPoliteness)}</p>
                </div>
                <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Професіоналізм</p>
                  <p className="text-sm font-black text-slate-900">{scoreLabel(cb.qProfessionalism)}</p>
                </div>
                <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Законність дій</p>
                  <p className="text-sm font-black text-slate-900">{scoreLabel(cb.qLawfulness)}</p>
                </div>
                <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Оперативність</p>
                  <p className="text-sm font-black text-slate-900">{scoreLabel(cb.qResponseSpeed)}</p>
                </div>
                <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Корисність допомоги</p>
                  <p className="text-sm font-black text-slate-900">{scoreLabel(cb.qHelpfulness)}</p>
                </div>
                <div className="rounded-xl border border-blue-100 bg-blue-50 p-3">
                  <p className="text-[10px] font-black uppercase tracking-widest text-blue-500">Загальна оцінка</p>
                  <p className="text-sm font-black text-blue-900">{scoreLabel(cb.qOverall)}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div className="rounded-xl border border-slate-100 p-3">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Створив</p>
                  <p className="text-sm font-bold text-slate-900">{userLabel(cb.createdBy)}</p>
                </div>
                <div className="rounded-xl border border-slate-100 p-3">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Виконавець callback</p>
                  <p className="text-sm font-bold text-slate-900">{userLabel(cb.assignedUser)}</p>
                </div>
              </div>

              {cb.surveyNotes ? (
                <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-3">
                  <p className="mb-1 text-[10px] font-black uppercase tracking-widest text-blue-500">Коментар опитування</p>
                  <p className="text-sm font-medium text-slate-700">{cb.surveyNotes}</p>
                </div>
              ) : null}
            </CardContent>
          </Card>
        ))}

        {filtered.length === 0 && (
          <div className="rounded-[2rem] border border-dashed border-slate-200 p-12 text-center">
            <ClipboardCheck className="mx-auto h-10 w-10 text-slate-300" />
            <p className="mt-3 text-sm font-bold text-slate-500">Немає callback-карток за обраними фільтрами</p>
          </div>
        )}
      </div>
    </div>
  )
}
