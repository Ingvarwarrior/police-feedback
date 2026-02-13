'use client'

import { useMemo, useState } from "react"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Plus, Loader2, Search, PhoneCall } from "lucide-react"
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

interface UserOption {
  id: string
  firstName: string | null
  lastName: string | null
  username: string
}

interface Props {
  officers: OfficerOption[]
  users: UserOption[]
}

const questionItems = [
  { key: "qPoliteness", label: "1. Чи були поліцейські ввічливими та коректними?" },
  { key: "qProfessionalism", label: "2. Чи діяли поліцейські професійно?" },
  { key: "qLawfulness", label: "3. Чи були дії поліцейських законними та обґрунтованими?" },
  { key: "qResponseSpeed", label: "4. Чи оперативно прибув наряд на виклик?" },
  { key: "qHelpfulness", label: "5. Чи була надана реальна допомога заявнику?" },
  { key: "qOverall", label: "6. Загальна оцінка роботи наряду" },
] as const

export default function CreateCallbackDialog({ officers, users }: Props) {
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [officerQuery, setOfficerQuery] = useState("")

  const [callDate, setCallDate] = useState(new Date().toISOString().split("T")[0])
  const [eoNumber, setEoNumber] = useState("")
  const [applicantName, setApplicantName] = useState("")
  const [applicantPhone, setApplicantPhone] = useState("")
  const [assignedUserId, setAssignedUserId] = useState<string>("UNASSIGNED")
  const [selectedOfficerIds, setSelectedOfficerIds] = useState<string[]>([])
  const [surveyNotes, setSurveyNotes] = useState("")
  const [ratings, setRatings] = useState<Record<string, string>>({})

  const filteredOfficers = useMemo(() => {
    const q = officerQuery.trim().toLowerCase()
    if (!q) return officers
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
    setAssignedUserId("UNASSIGNED")
    setSelectedOfficerIds([])
    setSurveyNotes("")
    setRatings({})
    setOfficerQuery("")
  }

  const toggleOfficer = (officerId: string, checked: boolean) => {
    setSelectedOfficerIds((prev) => {
      if (checked) return [...prev, officerId]
      return prev.filter((id) => id !== officerId)
    })
  }

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
        assignedUserId: assignedUserId === "UNASSIGNED" ? null : assignedUserId,
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

          <div className="space-y-2">
            <Label>Виконавець callback (опціонально)</Label>
            <Select value={assignedUserId} onValueChange={setAssignedUserId}>
              <SelectTrigger>
                <SelectValue placeholder="Не призначено" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="UNASSIGNED">Не призначено</SelectItem>
                {users.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {`${u.lastName || ""} ${u.firstName || ""}`.trim() || u.username}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3 rounded-2xl border border-slate-200 p-4">
            <Label>Поліцейські, яких стосується callback</Label>
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
              {filteredOfficers.map((o) => {
                const fullName = `${o.lastName || ""} ${o.firstName || ""}`.trim()
                const subtitle = [o.rank, o.department].filter(Boolean).join(", ")
                const checked = selectedOfficerIds.includes(o.id)
                return (
                  <label key={o.id} className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-100 p-3 hover:bg-slate-50">
                    <Checkbox checked={checked} onCheckedChange={(val) => toggleOfficer(o.id, val === true)} />
                    <div>
                      <p className="text-sm font-bold text-slate-900">{fullName}</p>
                      <p className="text-xs text-slate-500">{o.badgeNumber}{subtitle ? ` • ${subtitle}` : ""}</p>
                    </div>
                  </label>
                )
              })}
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
