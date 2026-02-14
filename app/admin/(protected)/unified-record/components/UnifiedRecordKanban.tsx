"use client"

import { useMemo } from "react"
import { format } from "date-fns"
import { uk } from "date-fns/locale"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { CalendarClock, ChevronLeft, ChevronRight, Clock3, User } from "lucide-react"

export type KanbanStage = "WAITING" | "IN_WORK" | "REVIEW" | "DONE"

const stageOrder: KanbanStage[] = ["WAITING", "IN_WORK", "REVIEW", "DONE"]

const stageMeta: Record<KanbanStage, { title: string; columnClass: string; badgeClass: string }> = {
  WAITING: {
    title: "Очікує",
    columnClass: "border-amber-200 bg-amber-50/40",
    badgeClass: "bg-amber-100 text-amber-700",
  },
  IN_WORK: {
    title: "В роботі",
    columnClass: "border-blue-200 bg-blue-50/40",
    badgeClass: "bg-blue-100 text-blue-700",
  },
  REVIEW: {
    title: "На перевірці",
    columnClass: "border-violet-200 bg-violet-50/40",
    badgeClass: "bg-violet-100 text-violet-700",
  },
  DONE: {
    title: "Завершено",
    columnClass: "border-emerald-200 bg-emerald-50/40",
    badgeClass: "bg-emerald-100 text-emerald-700",
  },
}

function getRecordStage(record: any): KanbanStage {
  if (record.status === "PROCESSED") return "DONE"
  if (record.status === "REVIEW") return "REVIEW"
  if (record.status === "IN_PROGRESS") return "IN_WORK"
  return "WAITING"
}

function formatDeadlineDelta(deadlineValue: string | Date, nowTs: number) {
  const deadlineTs = new Date(deadlineValue).getTime()
  const diff = deadlineTs - nowTs
  const abs = Math.abs(diff)
  const days = Math.floor(abs / (1000 * 60 * 60 * 24))
  const hours = Math.floor((abs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  const minutes = Math.floor((abs % (1000 * 60 * 60)) / (1000 * 60))

  if (diff < 0) {
    if (days > 0) return `прострочено ${days} дн.`
    if (hours > 0) return `прострочено ${hours} год.`
    return `прострочено ${Math.max(1, minutes)} хв.`
  }

  if (days > 0) return `${days} дн. ${hours} год.`
  if (hours > 0) return `${hours} год. ${minutes} хв.`
  return `${Math.max(1, minutes)} хв.`
}

function displayAssignee(record: any) {
  if (record.assignedUser) {
    const label = `${record.assignedUser.lastName || ""} ${record.assignedUser.firstName || ""}`.trim()
    if (label) return label
    return record.assignedUser.username || "Призначено"
  }
  return "Не призначено"
}

interface UnifiedRecordKanbanProps {
  records: any[]
  nowTs: number
  movingRecordId: string | null
  canMoveWorkflow: boolean
  onOpenRecord: (record: any) => void
  onMoveRecord: (record: any, stage: KanbanStage) => void
}

export default function UnifiedRecordKanban({
  records,
  nowTs,
  movingRecordId,
  canMoveWorkflow,
  onOpenRecord,
  onMoveRecord,
}: UnifiedRecordKanbanProps) {
  const grouped = useMemo(() => {
    const source = records.filter((r) => r.recordType === "EO" || r.recordType === "ZVERN")
    const data: Record<KanbanStage, any[]> = { WAITING: [], IN_WORK: [], REVIEW: [], DONE: [] }
    source.forEach((record) => {
      data[getRecordStage(record)].push(record)
    })
    return data
  }, [records])

  const totalKanban = grouped.WAITING.length + grouped.IN_WORK.length + grouped.REVIEW.length + grouped.DONE.length

  if (totalKanban === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50/70 p-8 text-center">
        <p className="text-sm font-semibold text-slate-700">Для дошки немає карток ЄО/Звернень за поточними фільтрами</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto pb-2">
      <div className="grid min-w-[1100px] grid-cols-4 gap-4">
        {stageOrder.map((stage) => (
          <div key={stage} className={cn("rounded-2xl border p-3", stageMeta[stage].columnClass)}>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900">{stageMeta[stage].title}</h3>
              <span className={cn("rounded-xl px-2.5 py-1 text-xs font-semibold", stageMeta[stage].badgeClass)}>
                {grouped[stage].length}
              </span>
            </div>

            <div className="space-y-3">
              {grouped[stage].length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 bg-white/70 p-3 text-xs text-slate-400">
                  Немає записів
                </div>
              ) : (
                grouped[stage].map((record) => {
                  const currentIndex = stageOrder.indexOf(stage)
                  const leftStage = currentIndex > 0 ? stageOrder[currentIndex - 1] : null
                  const rightStage = currentIndex < stageOrder.length - 1 ? stageOrder[currentIndex + 1] : null
                  const isMoving = movingRecordId === record.id

                  return (
                    <Card key={record.id} className="border-slate-200 bg-white shadow-sm">
                      <CardContent className="space-y-3 p-3">
                        <button type="button" onClick={() => onOpenRecord(record)} className="w-full text-left">
                          <p className="text-sm font-semibold text-slate-900">
                            {record.eoNumber} {record.description ? `• ${record.description}` : ""}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            {format(new Date(record.eoDate), "dd MMM yyyy", { locale: uk })}
                          </p>
                        </button>

                        <div className="space-y-1 text-xs text-slate-600">
                          <p className="inline-flex items-center gap-1">
                            <User className="h-3.5 w-3.5 text-slate-400" />
                            {displayAssignee(record)}
                          </p>
                          {record.deadline ? (
                            <p className={cn(
                              "inline-flex items-center gap-1 font-semibold",
                              new Date(record.deadline).getTime() < nowTs ? "text-red-600" : "text-slate-600"
                            )}>
                              <Clock3 className="h-3.5 w-3.5" />
                              {format(new Date(record.deadline), "dd.MM.yy")} • {formatDeadlineDelta(record.deadline, nowTs)}
                            </p>
                          ) : null}
                        </div>

                        <div className="flex items-center justify-between gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-8 rounded-lg"
                            disabled={!leftStage || isMoving || !canMoveWorkflow}
                            onClick={() => leftStage && onMoveRecord(record, leftStage)}
                          >
                            <ChevronLeft className="h-4 w-4" />
                          </Button>
                          <span className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-600">
                            <CalendarClock className="h-3 w-3" />
                            {stageMeta[stage].title}
                          </span>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-8 rounded-lg"
                            disabled={!rightStage || isMoving || !canMoveWorkflow}
                            onClick={() => rightStage && onMoveRecord(record, rightStage)}
                          >
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
