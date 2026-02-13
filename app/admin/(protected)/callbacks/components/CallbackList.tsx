'use client'

import { useMemo, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import {
  Search,
  User,
  Phone,
  Calendar,
  Users,
  ClipboardCheck,
  ChevronRight,
  Hash,
  Star,
  Trash2,
} from "lucide-react"
import { format } from "date-fns"
import { uk } from "date-fns/locale"
import { toast } from "sonner"
import { deleteCallback } from "../actions/callbackActions"
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
  callbackNumber?: number | null
  callDate: string | Date
  eoNumber: string
  applicantName: string
  applicantPhone: string
  status: string
  qOverall: number | null
  surveyNotes: string | null
  officers: OfficerRow[]
  assignedUser: UserRow | null
  createdBy: UserRow | null
}

interface Props {
  initialCallbacks: CallbackRow[]
  officers: OfficerRow[]
  canDelete: boolean
}

function userLabel(user: UserRow | null) {
  if (!user) return "Не призначено"
  return `${user.lastName || ""} ${user.firstName || ""}`.trim() || user.username
}

function formatCallbackNumber(value?: number | null) {
  if (typeof value !== "number" || value <= 0) return "----"
  return String(value).padStart(4, "0")
}

function officerLabel(officer: OfficerRow) {
  return `${officer.lastName || ""} ${officer.firstName || ""}`.trim() || officer.badgeNumber
}

function RatingStars({ value }: { value: number }) {
  return (
    <span className="inline-flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`h-3.5 w-3.5 ${star <= value ? "fill-amber-400 text-amber-500" : "text-slate-300"}`}
        />
      ))}
    </span>
  )
}

export default function CallbackList({ initialCallbacks, officers, canDelete }: Props) {
  const [callbacks, setCallbacks] = useState(initialCallbacks)
  const [search, setSearch] = useState("")
  const [status, setStatus] = useState<"ALL" | "PENDING" | "COMPLETED">("ALL")
  const [selectedCallback, setSelectedCallback] = useState<CallbackRow | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<CallbackRow | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const filtered = useMemo(() => {
    let data = [...callbacks]

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
          String(cb.callbackNumber ?? "").includes(q) ||
          cb.eoNumber.toLowerCase().includes(q) ||
          cb.applicantName.toLowerCase().includes(q) ||
          cb.applicantPhone.toLowerCase().includes(q) ||
          officersString.includes(q)
        )
      })
    }

    return data.sort((a, b) => new Date(b.callDate).getTime() - new Date(a.callDate).getTime())
  }, [callbacks, search, status])

  const handleDeleteCallback = async () => {
    if (!deleteTarget) return
    setIsDeleting(true)
    try {
      await deleteCallback(deleteTarget.id)
      setCallbacks((prev) => prev.filter((cb) => cb.id !== deleteTarget.id))
      if (selectedCallback?.id === deleteTarget.id) {
        setSelectedCallback(null)
      }
      toast.success("Callback-картку видалено")
      setDeleteTarget(null)
    } catch (error: any) {
      toast.error(error?.message || "Не вдалося видалити callback-картку")
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 rounded-[2rem] border border-slate-200 bg-white/90 p-3 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-12 rounded-xl pl-9"
            placeholder="Пошук за № callback, № ЄО, заявником, телефоном або поліцейським"
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
          <CreateCallbackDialog officers={officers} />
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
          <Card key={cb.id} className="overflow-hidden rounded-[2rem] border-slate-200 transition-all hover:border-blue-200 hover:shadow-md">
            <button
              type="button"
              onClick={() => setSelectedCallback(cb)}
              className="w-full text-left"
            >
              <CardContent className="space-y-4 p-5">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center gap-1 rounded-xl bg-slate-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-slate-600">
                        <Hash className="h-3 w-3" /> {formatCallbackNumber(cb.callbackNumber)}
                      </span>
                      <h3 className="text-lg font-black uppercase italic tracking-tight text-slate-900">
                        Callback до ЄО №{cb.eoNumber}
                      </h3>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-xs font-bold text-slate-500">
                      <span className="inline-flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" />
                        {format(new Date(cb.callDate), "dd MMMM yyyy", { locale: uk })}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <User className="h-3.5 w-3.5" />
                        {cb.applicantName}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Phone className="h-3.5 w-3.5" />
                        {cb.applicantPhone}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {typeof cb.qOverall === "number" && cb.qOverall > 0 ? (
                      <span className="inline-flex items-center gap-1.5 rounded-xl bg-blue-100 px-3 py-1 text-xs font-black uppercase tracking-widest text-blue-700">
                        <RatingStars value={cb.qOverall} />
                        {cb.qOverall}/5
                      </span>
                    ) : null}
                    <span className={`inline-flex rounded-xl px-3 py-1 text-xs font-black uppercase tracking-widest ${cb.status === "COMPLETED" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                      {cb.status === "COMPLETED" ? "Завершено" : "Очікує"}
                    </span>
                  </div>
                </div>

                <div>
                  <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-slate-400">Поліцейські, яких стосується</p>
                  <div className="flex flex-wrap gap-2">
                    {cb.officers.slice(0, 2).map((o) => (
                      <span key={o.id} className="inline-flex rounded-xl border border-slate-200 px-3 py-1 text-xs font-bold text-slate-700">
                        <Users className="mr-1 h-3 w-3" />
                        {officerLabel(o)} ({o.badgeNumber})
                      </span>
                    ))}
                    {cb.officers.length > 2 ? (
                      <span className="inline-flex rounded-xl border border-slate-200 px-3 py-1 text-xs font-bold text-slate-500">
                        +{cb.officers.length - 2} ще
                      </span>
                    ) : null}
                    {cb.officers.length === 0 ? <span className="text-sm text-slate-400">Не вказано</span> : null}
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

                <div className="flex items-center justify-end text-xs font-black uppercase tracking-widest text-blue-600">
                  Детальніше <ChevronRight className="ml-1 h-4 w-4" />
                </div>
              </CardContent>
            </button>
          </Card>
        ))}

        {filtered.length === 0 && (
          <div className="rounded-[2rem] border border-dashed border-slate-200 p-12 text-center">
            <ClipboardCheck className="mx-auto h-10 w-10 text-slate-300" />
            <p className="mt-3 text-sm font-bold text-slate-500">Немає callback-карток за обраними фільтрами</p>
          </div>
        )}
      </div>

      <Dialog open={Boolean(selectedCallback)} onOpenChange={(open) => !open && setSelectedCallback(null)}>
        <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto rounded-[2rem] p-0">
          {selectedCallback ? (
            <div>
              <div className="space-y-3 bg-slate-900 p-6 text-white">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1 rounded-xl bg-white/10 px-3 py-1 text-xs font-black uppercase tracking-widest text-blue-200">
                      <Hash className="h-3.5 w-3.5" />
                      {formatCallbackNumber(selectedCallback.callbackNumber)}
                    </span>
                    <span className={`inline-flex rounded-xl px-3 py-1 text-xs font-black uppercase tracking-widest ${selectedCallback.status === "COMPLETED" ? "bg-emerald-500/20 text-emerald-200" : "bg-amber-500/20 text-amber-200"}`}>
                      {selectedCallback.status === "COMPLETED" ? "Завершено" : "Очікує"}
                    </span>
                    {typeof selectedCallback.qOverall === "number" && selectedCallback.qOverall > 0 ? (
                      <span className="inline-flex items-center gap-1.5 rounded-xl bg-blue-500/20 px-3 py-1 text-xs font-black uppercase tracking-widest text-blue-200">
                        <RatingStars value={selectedCallback.qOverall} />
                        {selectedCallback.qOverall}/5
                      </span>
                    ) : null}
                  </div>
                  {canDelete ? (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(selectedCallback)}
                          className="inline-flex items-center gap-2 rounded-xl bg-rose-500/20 px-3 py-1.5 text-xs font-black uppercase tracking-widest text-rose-200 hover:bg-rose-500/30"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Видалити
                        </button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="rounded-2xl">
                        <AlertDialogHeader>
                          <AlertDialogTitle className="font-black uppercase">Видалити callback?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Картка буде видалена безповоротно.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel className="rounded-xl font-bold">Скасувати</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={handleDeleteCallback}
                            disabled={isDeleting}
                            className="rounded-xl bg-rose-600 font-black hover:bg-rose-700"
                          >
                            {isDeleting ? "Видалення..." : "Видалити"}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  ) : null}
                </div>
                <DialogHeader>
                  <DialogTitle className="text-2xl font-black uppercase italic tracking-tight">
                    Callback до ЄО №{selectedCallback.eoNumber}
                  </DialogTitle>
                </DialogHeader>
              </div>

              <div className="space-y-4 p-6">
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
                  <div className="rounded-2xl border border-slate-200 p-4">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Дата виклику</p>
                    <p className="mt-1 text-base font-black text-slate-900">
                      {format(new Date(selectedCallback.callDate), "dd MMMM yyyy", { locale: uk })}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 p-4">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">ПІБ заявника</p>
                    <p className="mt-1 text-base font-black text-slate-900">{selectedCallback.applicantName}</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 p-4">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Телефон заявника</p>
                    <p className="mt-1 text-base font-black text-slate-900">{selectedCallback.applicantPhone}</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 p-4">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Створив</p>
                    <p className="mt-1 text-base font-black text-slate-900">{userLabel(selectedCallback.createdBy)}</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 p-4">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Виконавець callback</p>
                    <p className="mt-1 text-base font-black text-slate-900">{userLabel(selectedCallback.assignedUser)}</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 p-4">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Номер callback</p>
                    <p className="mt-1 text-base font-black text-slate-900">№{formatCallbackNumber(selectedCallback.callbackNumber)}</p>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 p-4">
                  <p className="mb-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Поліцейські, яких стосується</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedCallback.officers.map((o) => (
                      <span key={o.id} className="inline-flex rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-700">
                        {officerLabel(o)} ({o.badgeNumber})
                        {o.rank ? ` • ${o.rank}` : ""}
                        {o.department ? ` • ${o.department}` : ""}
                      </span>
                    ))}
                    {selectedCallback.officers.length === 0 ? <span className="text-sm text-slate-400">Не вказано</span> : null}
                  </div>
                </div>

                <div className="rounded-2xl border border-blue-100 bg-blue-50/50 p-4">
                  <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-blue-600">Результати опитування</p>
                  <div className="max-h-[36vh] overflow-y-auto rounded-xl border border-blue-100 bg-white p-3 text-sm font-medium leading-relaxed text-slate-700 whitespace-pre-wrap">
                    {selectedCallback.surveyNotes || "Опитування ще не заповнено."}
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  )
}
