'use client'

import { useMemo, useState } from "react"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Plus, Loader2, Search, PhoneCall, UserPlus, XCircle } from "lucide-react"
import { toast } from "sonner"
import { createCallback } from "../actions/callbackActions"

interface OfficerOption {
  id: string
  firstName: string | null
  lastName: string | null
  badgeNumber: string
  rank: string | null
  department: string | null
}

interface Props {
  officers: OfficerOption[]
}

const questionItems = [
  { key: "qResponseSpeed", label: "1. Після дзвінка на 102 наряд прибув оперативно?" },
  { key: "qPoliteness", label: "2. Під час прибуття поліцейські були ввічливими та коректними?" },
  { key: "qProfessionalism", label: "3. Під час спілкування поліцейські діяли професійно та впевнено?" },
  { key: "qLawfulness", label: "4. Дії поліцейських були законними та зрозумілими для вас?" },
  { key: "qHelpfulness", label: "5. За результатом ви отримали реальну допомогу/вирішення?" },
  { key: "qOverall", label: "6. Загальна оцінка роботи наряду за цей виклик" },
] as const

export default function CreateCallbackDialog({ officers }: Props) {
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [officerQuery, setOfficerQuery] = useState("")

  const [callDate, setCallDate] = useState(new Date().toISOString().split("T")[0])
  const [eoNumber, setEoNumber] = useState("")
  const [applicantName, setApplicantName] = useState("")
  const [applicantPhone, setApplicantPhone] = useState("")
  const [selectedOfficerIds, setSelectedOfficerIds] = useState<string[]>([])
  const [surveyNotes, setSurveyNotes] = useState("")
  const [ratings, setRatings] = useState<Record<string, string>>({})

  const filteredOfficers = useMemo(() => {
    const q = officerQuery.trim().toLowerCase()
    if (q.length < 2) return []
    return officers.filter((o) => {
      const fullName = `${o.lastName || ""} ${o.firstName || ""}`.toLowerCase()
      return fullName.includes(q) || o.badgeNumber.toLowerCase().includes(q)
    })
  }, [officers, officerQuery])

  const resetForm = () => {
    setCallDate(new Date().toISOString().split("T")[0])
    setEoNumber("")
    setApplicantName("")
    setApplicantPhone("")
    setSelectedOfficerIds([])
    setSurveyNotes("")
    setRatings({})
    setOfficerQuery("")
  }

  const selectedOfficers = useMemo(
    () => officers.filter((o) => selectedOfficerIds.includes(o.id)),
    [officers, selectedOfficerIds]
  )

  const searchResults = useMemo(
    () => filteredOfficers.filter((o) => !selectedOfficerIds.includes(o.id)),
    [filteredOfficers, selectedOfficerIds]
  )

  const handleSubmit = async () => {
    if (!eoNumber.trim()) {
      toast.error("Вкажіть № ЄО виклику")
      return
    }
    if (!applicantName.trim()) {
      toast.error("Вкажіть ПІБ заявника")
      return
    }
    if (!applicantPhone.trim()) {
      toast.error("Вкажіть номер телефону заявника")
      return
    }
    if (selectedOfficerIds.length === 0) {
      toast.error("Оберіть поліцейських, яких стосується callback")
      return
    }

    setIsLoading(true)
    try {
      await createCallback({
        callDate,
        eoNumber,
        applicantName,
        applicantPhone,
        officerIds: selectedOfficerIds,
        qPoliteness: ratings.qPoliteness ? Number(ratings.qPoliteness) : undefined,
        qProfessionalism: ratings.qProfessionalism ? Number(ratings.qProfessionalism) : undefined,
        qLawfulness: ratings.qLawfulness ? Number(ratings.qLawfulness) : undefined,
        qResponseSpeed: ratings.qResponseSpeed ? Number(ratings.qResponseSpeed) : undefined,
        qHelpfulness: ratings.qHelpfulness ? Number(ratings.qHelpfulness) : undefined,
        qOverall: ratings.qOverall ? Number(ratings.qOverall) : undefined,
        surveyNotes,
      })
      toast.success("Callback-картку створено")
      setIsOpen(false)
      resetForm()
    } catch (error: any) {
      toast.error(error?.message || "Не вдалося створити callback")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="h-12 rounded-2xl px-6 font-black uppercase tracking-widest text-xs">
          <Plus className="mr-2 h-4 w-4" />
          Додати callback
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto rounded-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-black uppercase italic tracking-tight">
            <PhoneCall className="h-5 w-5 text-blue-500" />
            Нова callback-картка
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-2">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Дата виклику</Label>
              <Input type="date" value={callDate} onChange={(e) => setCallDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>№ ЄО виклику</Label>
              <Input value={eoNumber} onChange={(e) => setEoNumber(e.target.value)} placeholder="Напр. 1245" />
            </div>
            <div className="space-y-2">
              <Label>ПІБ заявника</Label>
              <Input value={applicantName} onChange={(e) => setApplicantName(e.target.value)} placeholder="Прізвище Ім'я По батькові" />
            </div>
            <div className="space-y-2">
              <Label>Номер телефону заявника</Label>
              <Input value={applicantPhone} onChange={(e) => setApplicantPhone(e.target.value)} placeholder="+380..." />
            </div>
          </div>

          <div className="space-y-3 rounded-2xl border border-slate-200 p-4">
            <Label>Поліцейські, яких стосується callback</Label>
            {selectedOfficers.length > 0 && (
              <div className="mb-2 flex flex-wrap gap-2">
                {selectedOfficers.map((o) => (
                  <div key={o.id} className="flex items-center gap-2 rounded-xl border border-blue-100 bg-blue-50 px-3 py-1.5 text-[11px] font-black text-blue-700">
                    <span>{`${o.lastName || ""} ${o.firstName || ""}`.trim()} ({o.badgeNumber})</span>
                    <button
                      onClick={() => setSelectedOfficerIds((prev) => prev.filter((id) => id !== o.id))}
                      className="hover:text-blue-900"
                      type="button"
                    >
                      <XCircle className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                className="pl-9"
                value={officerQuery}
                onChange={(e) => setOfficerQuery(e.target.value)}
                placeholder="Пошук за прізвищем або жетоном"
              />
            </div>
            <div className="max-h-56 space-y-2 overflow-y-auto rounded-xl border border-slate-100 p-2">
              {officerQuery.trim().length < 2 && (
                <p className="px-2 py-4 text-center text-xs font-semibold text-slate-400">
                  Введіть мінімум 2 символи для пошуку поліцейського
                </p>
              )}
              {searchResults.map((o) => {
                const fullName = `${o.lastName || ""} ${o.firstName || ""}`.trim()
                const subtitle = [o.rank, o.department].filter(Boolean).join(", ")
                return (
                  <button
                    key={o.id}
                    type="button"
                    onClick={() => {
                      setSelectedOfficerIds((prev) => [...prev, o.id])
                      setOfficerQuery("")
                    }}
                    className="flex w-full items-start justify-between gap-3 rounded-xl border border-slate-100 p-3 text-left hover:bg-slate-50"
                  >
                    <div>
                      <p className="text-sm font-bold text-slate-900">{fullName}</p>
                      <p className="text-xs text-slate-500">{o.badgeNumber}{subtitle ? ` • ${subtitle}` : ""}</p>
                    </div>
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                      <UserPlus className="h-4 w-4" />
                    </div>
                  </button>
                )
              })}
              {officerQuery.trim().length >= 2 && searchResults.length === 0 && (
                <p className="px-2 py-4 text-center text-xs font-semibold text-slate-400">Нічого не знайдено</p>
              )}
            </div>
          </div>

          <div className="space-y-3 rounded-2xl border border-blue-200 bg-blue-50/40 p-4">
            <h3 className="text-xs font-black uppercase tracking-widest text-blue-700">Питання для опитування заявника</h3>
            <div className="space-y-3">
              {questionItems.map((q) => (
                <div key={q.key} className="grid grid-cols-1 gap-2 md:grid-cols-[1fr_180px] md:items-center">
                  <Label className="font-semibold text-slate-700">{q.label}</Label>
                  <Select
                    value={ratings[q.key] || "UNSET"}
                    onValueChange={(value) => setRatings((prev) => ({ ...prev, [q.key]: value === "UNSET" ? "" : value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Оцінка 1-5" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="UNSET">Не вказано</SelectItem>
                      {[1, 2, 3, 4, 5].map((v) => (
                        <SelectItem key={v} value={String(v)}>{v}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
            <div className="space-y-2">
              <Label>Додатковий коментар за результатом опитування</Label>
              <Textarea value={surveyNotes} onChange={(e) => setSurveyNotes(e.target.value)} placeholder="Короткий підсумок розмови із заявником" />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)} className="rounded-xl">Скасувати</Button>
          <Button onClick={handleSubmit} disabled={isLoading} className="rounded-xl">
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Зберегти callback
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
