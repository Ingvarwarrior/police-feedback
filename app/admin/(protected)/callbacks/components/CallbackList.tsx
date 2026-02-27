'use client'

import { useEffect, useMemo, useState } from "react"
import { useSearchParams } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
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
  RotateCcw,
  Filter,
} from "lucide-react"
import { format } from "date-fns"
import { uk } from "date-fns/locale"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { assignCallbackExecutor, deleteCallback, updateCallbackProcessing } from "../actions/callbackActions"
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
  assignedUserId?: string | null
  status: string
  checkResult: string | null
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
  currentUserId: string
  canDelete: boolean
  canProcess: boolean
  canProcessAssignedOnly: boolean
  canAssign: boolean
}

const FILTERS_STORAGE_KEY = "pf:filters:callbacks"

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

function checkResultLabel(value: string | null | undefined) {
  if (value === "CONFIRMED") return "Підтверджується"
  if (value === "NOT_CONFIRMED") return "Не підтверджується"
  return "Не вказано"
}

function checkResultChipClass(value: string | null | undefined) {
  if (value === "CONFIRMED") return "status-chip-processed"
  if (value === "NOT_CONFIRMED") return "status-chip-waiting"
  return "status-chip-waiting"
}

function isCallbackInWork(cb: CallbackRow) {
  return cb.status !== "COMPLETED" && !!(cb.assignedUserId || cb.assignedUser?.id)
}

function callbackStatusLabel(cb: CallbackRow) {
  if (cb.status === "COMPLETED") return "Опрацьовано"
  if (isCallbackInWork(cb)) return "В роботі"
  return "Очікує"
}

function callbackStatusChipClass(cb: CallbackRow) {
  if (cb.status === "COMPLETED") return "status-chip-processed"
  if (isCallbackInWork(cb)) return "status-chip-progress"
  return "status-chip-waiting"
}

function callbackResultLabel(cb: CallbackRow) {
  if (cb.status === "COMPLETED") {
    const result = checkResultLabel(cb.checkResult)
    return result === "Не вказано" ? "Опрацьовано" : result
  }
  return isCallbackInWork(cb) ? "В процесі розгляду..." : "Очікує призначення"
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

export default function CallbackList({
  initialCallbacks,
  officers,
  users,
  currentUserId,
  canDelete,
  canProcess,
  canProcessAssignedOnly,
  canAssign,
}: Props) {
  const searchParams = useSearchParams()
  const [callbacks, setCallbacks] = useState(initialCallbacks)
  const [search, setSearch] = useState("")
  const [status, setStatus] = useState<"ALL" | "PENDING" | "COMPLETED">("ALL")
  const [checkResult, setCheckResult] = useState<"ALL" | "UNSET" | "CONFIRMED" | "NOT_CONFIRMED">("ALL")
  const [executor, setExecutor] = useState<string>("ALL")
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "rating_desc" | "rating_asc">("newest")
  const [periodFrom, setPeriodFrom] = useState("")
  const [periodTo, setPeriodTo] = useState("")
  const [selectedCallback, setSelectedCallback] = useState<CallbackRow | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<CallbackRow | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [processingResult, setProcessingResult] = useState<"UNSET" | "CONFIRMED" | "NOT_CONFIRMED">("UNSET")
  const [processingExecutorId, setProcessingExecutorId] = useState<string>("UNASSIGNED")
  const [isAssigningExecutor, setIsAssigningExecutor] = useState(false)
  const [isSavingProcessing, setIsSavingProcessing] = useState(false)

  useEffect(() => {
    setCallbacks(initialCallbacks)
  }, [initialCallbacks])

  useEffect(() => {
    try {
      const raw = localStorage.getItem(FILTERS_STORAGE_KEY)
      if (!raw) return
      const parsed = JSON.parse(raw)
      if (typeof parsed.search === "string") setSearch(parsed.search)
      if (["ALL", "PENDING", "COMPLETED"].includes(parsed.status)) setStatus(parsed.status)
      if (["ALL", "UNSET", "CONFIRMED", "NOT_CONFIRMED"].includes(parsed.checkResult)) {
        setCheckResult(parsed.checkResult)
      }
      if (typeof parsed.executor === "string") setExecutor(parsed.executor)
      if (["newest", "oldest", "rating_desc", "rating_asc"].includes(parsed.sortBy)) setSortBy(parsed.sortBy)
      if (typeof parsed.periodFrom === "string") setPeriodFrom(parsed.periodFrom)
      if (typeof parsed.periodTo === "string") setPeriodTo(parsed.periodTo)
    } catch {
      // ignore malformed local storage
    }
  }, [])

  useEffect(() => {
    localStorage.setItem(
      FILTERS_STORAGE_KEY,
      JSON.stringify({ search, status, checkResult, executor, sortBy, periodFrom, periodTo })
    )
  }, [search, status, checkResult, executor, sortBy, periodFrom, periodTo])

  useEffect(() => {
    const callbackId = searchParams.get("callbackId")
    if (!callbackId) return
    const callback = callbacks.find((item) => item.id === callbackId)
    if (callback) {
      setSelectedCallback(callback)
    }
  }, [searchParams, callbacks])

  useEffect(() => {
    if (!selectedCallback) {
      setProcessingResult("UNSET")
      setProcessingExecutorId("UNASSIGNED")
      return
    }
    setProcessingExecutorId(selectedCallback.assignedUser?.id || "UNASSIGNED")
    const value = selectedCallback.checkResult
    if (value === "CONFIRMED" || value === "NOT_CONFIRMED") {
      setProcessingResult(value)
      return
    }
    setProcessingResult("UNSET")
  }, [selectedCallback])

  const assignableUsers = useMemo(() => {
    return [...users].sort((a, b) => userLabel(a).localeCompare(userLabel(b), "uk"))
  }, [users])

  const usersById = useMemo(() => {
    const map = new Map<string, UserRow>()
    assignableUsers.forEach((item) => map.set(item.id, item))
    return map
  }, [assignableUsers])

  const executorOptions = useMemo(() => {
    return assignableUsers.map((item) => ({ id: item.id, label: userLabel(item) }))
  }, [assignableUsers])

  const filtered = useMemo(() => {
    let data = [...callbacks]

    if (status !== "ALL") {
      data = data.filter((cb) => cb.status === status)
    }

    if (checkResult !== "ALL") {
      if (checkResult === "UNSET") {
        data = data.filter((cb) => !cb.checkResult || cb.checkResult === "UNSET")
      } else {
        data = data.filter((cb) => cb.checkResult === checkResult)
      }
    }

    if (executor === "UNASSIGNED") {
      data = data.filter((cb) => !cb.assignedUser?.id)
    } else if (executor !== "ALL") {
      data = data.filter((cb) => cb.assignedUser?.id === executor)
    }

    if (periodFrom) {
      const from = new Date(periodFrom)
      from.setHours(0, 0, 0, 0)
      data = data.filter((cb) => new Date(cb.callDate) >= from)
    }

    if (periodTo) {
      const to = new Date(periodTo)
      to.setHours(23, 59, 59, 999)
      data = data.filter((cb) => new Date(cb.callDate) <= to)
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

    return data.sort((a, b) => {
      if (sortBy === "oldest") {
        return new Date(a.callDate).getTime() - new Date(b.callDate).getTime()
      }
      if (sortBy === "rating_desc") {
        return (b.qOverall || 0) - (a.qOverall || 0)
      }
      if (sortBy === "rating_asc") {
        return (a.qOverall || 0) - (b.qOverall || 0)
      }
      return new Date(b.callDate).getTime() - new Date(a.callDate).getTime()
    })
  }, [callbacks, search, status, checkResult, executor, sortBy, periodFrom, periodTo])

  const selectedCallbackAssignedToCurrentUser = !!selectedCallback && selectedCallback.assignedUserId === currentUserId
  const canProcessSelected = !!selectedCallback && (canProcess || (canProcessAssignedOnly && selectedCallbackAssignedToCurrentUser))

  const resetFilters = () => {
    setSearch("")
    setStatus("ALL")
    setCheckResult("ALL")
    setExecutor("ALL")
    setSortBy("newest")
    setPeriodFrom("")
    setPeriodTo("")
  }

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

  const handleSaveProcessing = async () => {
    if (!selectedCallback) return
    if (!canProcessSelected) {
      toast.error("У вас немає прав для опрацювання цього callback")
      return
    }

    const selectedExecutorAfterSave = canAssign ? processingExecutorId : (selectedCallback.assignedUserId || "UNASSIGNED")
    if (selectedExecutorAfterSave === "UNASSIGNED") {
      toast.error("Спочатку призначте виконавця callback")
      return
    }

    setIsSavingProcessing(true)
    try {
      let nextCallback = selectedCallback
      const currentAssigned = selectedCallback.assignedUser?.id || "UNASSIGNED"
      if (canAssign && processingExecutorId !== currentAssigned) {
        setIsAssigningExecutor(true)
        const assignResult = await assignCallbackExecutor({
          callbackId: selectedCallback.id,
          assignedUserId: processingExecutorId === "UNASSIGNED" ? null : processingExecutorId,
        })
        nextCallback = {
          ...nextCallback,
          assignedUserId: assignResult.callback?.assignedUserId || null,
          assignedUser:
            assignResult.callback?.assignedUser ||
            (processingExecutorId !== "UNASSIGNED" ? usersById.get(processingExecutorId) || null : null),
        }
        setIsAssigningExecutor(false)
      }

      const result = await updateCallbackProcessing({ callbackId: selectedCallback.id, checkResult: processingResult })
      const updated = {
        ...nextCallback,
        checkResult: result.callback.checkResult,
        status: result.callback.status,
      }

      setCallbacks((prev) =>
        prev.map((cb) => (cb.id === selectedCallback.id ? { ...cb, ...updated } : cb))
      )
      setSelectedCallback((prev) => (prev ? { ...prev, ...updated } : prev))
      toast.success("Опрацювання callback збережено")
    } catch (error: any) {
      toast.error(error?.message || "Не вдалося зберегти опрацювання")
    } finally {
      setIsAssigningExecutor(false)
      setIsSavingProcessing(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="ds-filter-panel">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative w-full lg:max-w-lg">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-11 rounded-xl pl-9"
              placeholder="Пошук: № callback, № ЄО, заявник, телефон, поліцейський"
            />
          </div>

          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" className="h-11 rounded-xl" onClick={resetFilters}>
              <RotateCcw className="mr-2 h-4 w-4" />
              Скинути
            </Button>
            <CreateCallbackDialog officers={officers} />
          </div>
        </div>

        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-6">
          <Select value={status} onValueChange={(value) => setStatus(value as "ALL" | "PENDING" | "COMPLETED")}>
            <SelectTrigger className="h-11 rounded-xl">
              <SelectValue placeholder="Статус" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Всі статуси</SelectItem>
              <SelectItem value="PENDING">В роботі / очікує</SelectItem>
              <SelectItem value="COMPLETED">Опрацьовано</SelectItem>
            </SelectContent>
          </Select>

          <Select value={checkResult} onValueChange={(value) => setCheckResult(value as "ALL" | "UNSET" | "CONFIRMED" | "NOT_CONFIRMED")}>
            <SelectTrigger className="h-11 rounded-xl">
              <SelectValue placeholder="Результат перевірки" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Всі результати</SelectItem>
              <SelectItem value="CONFIRMED">Підтверджується</SelectItem>
              <SelectItem value="NOT_CONFIRMED">Не підтверджується</SelectItem>
              <SelectItem value="UNSET">Не вказано</SelectItem>
            </SelectContent>
          </Select>

          <Select value={executor} onValueChange={setExecutor}>
            <SelectTrigger className="h-11 rounded-xl">
              <SelectValue placeholder="Виконавець" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Всі виконавці</SelectItem>
              <SelectItem value="UNASSIGNED">Без виконавця</SelectItem>
              {executorOptions.map((item) => (
                <SelectItem key={item.id} value={item.id}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={sortBy} onValueChange={(value) => setSortBy(value as "newest" | "oldest" | "rating_desc" | "rating_asc")}>
            <SelectTrigger className="h-11 rounded-xl">
              <SelectValue placeholder="Сортування" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Спочатку нові</SelectItem>
              <SelectItem value="oldest">Спочатку старі</SelectItem>
              <SelectItem value="rating_desc">Рейтинг (вищий)</SelectItem>
              <SelectItem value="rating_asc">Рейтинг (нижчий)</SelectItem>
            </SelectContent>
          </Select>

          <Input type="date" value={periodFrom} onChange={(e) => setPeriodFrom(e.target.value)} className="h-11 rounded-xl" />
          <Input type="date" value={periodTo} onChange={(e) => setPeriodTo(e.target.value)} className="h-11 rounded-xl" />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Card className="rounded-3xl border-slate-200">
          <CardContent className="p-5">
            <p className="ds-field-label">Всього callback</p>
            <p className="mt-2 text-3xl font-black text-slate-900">{filtered.length}</p>
          </CardContent>
        </Card>
        <Card className="rounded-3xl border-slate-200">
          <CardContent className="p-5">
            <p className="ds-field-label">В роботі</p>
            <p className="mt-2 text-3xl font-black text-blue-600">
              {filtered.filter((cb) => cb.status === "PENDING" && !!(cb.assignedUserId || cb.assignedUser?.id)).length}
            </p>
          </CardContent>
        </Card>
        <Card className="rounded-3xl border-slate-200">
          <CardContent className="p-5">
            <p className="ds-field-label">Опрацьовані</p>
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
                      <span className="ds-chip-muted">
                        <Hash className="h-3 w-3" /> {formatCallbackNumber(cb.callbackNumber)}
                      </span>
                      <h3 className="text-lg font-semibold tracking-tight text-slate-900">
                        Callback до ЄО №{cb.eoNumber}
                      </h3>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-xs font-medium text-slate-500">
                      <span className="inline-flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" />
                        {format(new Date(cb.callDate), "dd MMMM yyyy", { locale: uk })}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {typeof cb.qOverall === "number" && cb.qOverall > 0 ? (
                      <span className="ds-chip-active">
                        <RatingStars value={cb.qOverall} />
                        {cb.qOverall}/5
                      </span>
                    ) : null}
                    {cb.status === "COMPLETED" ? (
                      <span className={cn(checkResultChipClass(cb.checkResult))}>
                        {checkResultLabel(cb.checkResult)}
                      </span>
                    ) : null}
                    <span className={cn(callbackStatusChipClass(cb))}>
                      {callbackStatusLabel(cb)}
                    </span>
                  </div>
                </div>

                <div>
                  <p className="mb-2 ds-field-label">Поліцейські, яких стосується</p>
                  <div className="flex flex-wrap gap-2">
                    {cb.officers.slice(0, 2).map((o) => (
                      <span key={o.id} className="inline-flex rounded-xl border border-slate-200 px-3 py-1 text-xs font-medium text-slate-700">
                        <Users className="mr-1 h-3 w-3" />
                        {officerLabel(o)} ({o.badgeNumber})
                      </span>
                    ))}
                    {cb.officers.length > 2 ? (
                      <span className="inline-flex rounded-xl border border-slate-200 px-3 py-1 text-xs font-medium text-slate-500">
                        +{cb.officers.length - 2} ще
                      </span>
                    ) : null}
                    {cb.officers.length === 0 ? <span className="text-sm text-slate-400">Не вказано</span> : null}
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                  <div className="rounded-xl border border-slate-100 p-3">
                    <p className="ds-field-label">Заявник</p>
                    <p className="text-sm font-semibold text-slate-900">{cb.applicantName}</p>
                    <p className="mt-1 text-xs font-semibold text-slate-500">{cb.applicantPhone}</p>
                  </div>
                  <div className="rounded-xl border border-slate-100 p-3">
                    <p className="ds-field-label">Результат</p>
                    <p
                      className={cn(
                        "text-sm font-semibold",
                        cb.status === "COMPLETED"
                          ? cb.checkResult === "NOT_CONFIRMED"
                            ? "text-amber-700"
                            : "text-emerald-700"
                          : isCallbackInWork(cb)
                            ? "text-blue-600"
                            : "text-slate-500",
                      )}
                    >
                      {callbackResultLabel(cb)}
                    </p>
                  </div>
                  <div className="rounded-xl border border-slate-100 p-3">
                    <p className="ds-field-label">Відповідальний</p>
                    <p className="text-sm font-semibold text-slate-900">{userLabel(cb.assignedUser)}</p>
                  </div>
                </div>

                <div className="flex items-center justify-end text-xs font-semibold tracking-wide text-blue-600">
                  Детальніше <ChevronRight className="ml-1 h-4 w-4" />
                </div>
              </CardContent>
            </button>
          </Card>
        ))}

        {filtered.length === 0 && (
          <div className="ds-empty-state">
            <ClipboardCheck className="mx-auto h-10 w-10 text-slate-300" />
            <p className="ds-empty-title">Немає callback-карток за поточними фільтрами</p>
            <p className="ds-empty-description">Скиньте фільтри або створіть нову callback-картку.</p>
            <div className="ds-empty-actions">
              <Button type="button" variant="outline" className="rounded-xl" onClick={resetFilters}>
                <Filter className="mr-2 h-4 w-4" />
                Скинути фільтри
              </Button>
              <CreateCallbackDialog officers={officers} />
            </div>
          </div>
        )}
      </div>

      <Dialog open={Boolean(selectedCallback)} onOpenChange={(open) => !open && setSelectedCallback(null)}>
        <DialogContent className="max-h-[90vh] max-w-4xl overflow-hidden rounded-[2rem] p-0">
          {selectedCallback ? (
            <div className="flex max-h-[90vh] flex-col">
              <div className="space-y-3 bg-slate-900 p-6 text-white">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="ds-chip bg-white/10 text-blue-100 border-white/15">
                      <Hash className="h-3.5 w-3.5" />
                      {formatCallbackNumber(selectedCallback.callbackNumber)}
                    </span>
                    <span className={cn(
                      callbackStatusChipClass(selectedCallback)
                    )}>
                      {callbackStatusLabel(selectedCallback)}
                    </span>
                    {typeof selectedCallback.qOverall === "number" && selectedCallback.qOverall > 0 ? (
                      <span className="ds-chip-active">
                        <RatingStars value={selectedCallback.qOverall} />
                        {selectedCallback.qOverall}/5
                      </span>
                    ) : null}
                    <span className={cn(checkResultChipClass(selectedCallback.checkResult))}>
                      {checkResultLabel(selectedCallback.checkResult)}
                    </span>
                  </div>
                  {canDelete ? (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(selectedCallback)}
                          className="inline-flex items-center gap-2 rounded-xl bg-rose-500/20 px-3 py-1.5 text-xs font-semibold tracking-wide text-rose-200 hover:bg-rose-500/30"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Видалити
                        </button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="rounded-2xl">
                        <AlertDialogHeader>
                          <AlertDialogTitle className="font-semibold">Видалити callback?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Картка буде видалена безповоротно.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel className="rounded-xl font-semibold">Скасувати</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={handleDeleteCallback}
                            disabled={isDeleting}
                            className="rounded-xl bg-rose-600 font-semibold hover:bg-rose-700"
                          >
                            {isDeleting ? "Видалення..." : "Видалити"}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  ) : null}
                </div>
                <DialogHeader>
                  <DialogTitle className="text-2xl font-semibold tracking-tight">
                    Callback до ЄО №{selectedCallback.eoNumber}
                  </DialogTitle>
                </DialogHeader>
              </div>

              <div className="space-y-4 overflow-y-auto p-6">
                <div className="ds-detail-grid">
                  <div className="ds-detail-item">
                    <p className="ds-detail-label">Дата виклику</p>
                    <p className="ds-detail-value">{format(new Date(selectedCallback.callDate), "dd MMMM yyyy", { locale: uk })}</p>
                  </div>
                  <div className="ds-detail-item">
                    <p className="ds-detail-label">ПІБ заявника</p>
                    <p className="ds-detail-value">{selectedCallback.applicantName}</p>
                  </div>
                  <div className="ds-detail-item">
                    <p className="ds-detail-label">Телефон заявника</p>
                    <p className="ds-detail-value">{selectedCallback.applicantPhone}</p>
                  </div>
                  <div className="ds-detail-item">
                    <p className="ds-detail-label">Створив</p>
                    <p className="ds-detail-value">{userLabel(selectedCallback.createdBy)}</p>
                  </div>
                  <div className="ds-detail-item">
                    <p className="ds-detail-label">Виконавець callback</p>
                    {canAssign ? (
                      <Select
                        value={processingExecutorId}
                        onValueChange={(value) => setProcessingExecutorId(value)}
                        disabled={isAssigningExecutor || isSavingProcessing}
                      >
                        <SelectTrigger className="h-10 rounded-xl bg-white font-semibold text-slate-900">
                          <SelectValue placeholder="Оберіть виконавця" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="UNASSIGNED">Без виконавця</SelectItem>
                          {executorOptions.map((item) => (
                            <SelectItem key={item.id} value={item.id}>
                              {item.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <p className="ds-detail-value">{userLabel(selectedCallback.assignedUser)}</p>
                    )}
                  </div>
                  <div className="ds-detail-item">
                    <p className="ds-detail-label">Номер callback</p>
                    <p className="ds-detail-value">№{formatCallbackNumber(selectedCallback.callbackNumber)}</p>
                  </div>
                  <div className="ds-detail-item">
                    <p className="ds-detail-label">Результат перевірки</p>
                    <p className="ds-detail-value">{checkResultLabel(selectedCallback.checkResult)}</p>
                  </div>
                </div>

                {canProcessSelected ? (
                  <div className="rounded-2xl border border-emerald-100 bg-emerald-50/40 p-4">
                    <p className="mb-3 ds-field-label text-emerald-700">Опрацювання callback</p>
                    {!selectedCallback.assignedUserId && (
                      <p className="mb-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700">
                        Спочатку призначте виконавця callback, потім збережіть результат перевірки.
                      </p>
                    )}
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_auto] md:items-end">
                      <div className="space-y-2">
                        <p className="text-xs font-semibold text-slate-700">Результат перевірки</p>
                        <Select
                          value={processingResult}
                          onValueChange={(value) => setProcessingResult(value as "UNSET" | "CONFIRMED" | "NOT_CONFIRMED")}
                        >
                          <SelectTrigger className="h-11 rounded-xl bg-white">
                            <SelectValue placeholder="Оберіть результат" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="UNSET">Не вказано</SelectItem>
                            <SelectItem value="CONFIRMED">Підтверджується</SelectItem>
                            <SelectItem value="NOT_CONFIRMED">Не підтверджується</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <Button
                        type="button"
                        className="h-11 rounded-xl font-semibold"
                        onClick={handleSaveProcessing}
                        disabled={isSavingProcessing || (!canAssign && !selectedCallback.assignedUserId)}
                      >
                        {isSavingProcessing ? "Збереження..." : "Зберегти опрацювання"}
                      </Button>
                    </div>
                  </div>
                ) : null}

                <div className="ds-detail-panel">
                  <p className="mb-3 ds-field-label">Поліцейські, яких стосується</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedCallback.officers.map((o) => (
                      <span key={o.id} className="inline-flex rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700">
                        {officerLabel(o)} ({o.badgeNumber})
                        {o.rank ? ` • ${o.rank}` : ""}
                        {o.department ? ` • ${o.department}` : ""}
                      </span>
                    ))}
                    {selectedCallback.officers.length === 0 ? <span className="text-sm text-slate-400">Не вказано</span> : null}
                  </div>
                </div>

                <div className="rounded-2xl border border-blue-100 bg-blue-50/40 p-4">
                  <p className="mb-2 ds-field-label text-blue-700">Результати опитування</p>
                  <div className="max-h-[36vh] overflow-y-auto rounded-xl border border-blue-100 bg-white p-3 text-sm leading-relaxed text-slate-700 whitespace-pre-wrap">
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
