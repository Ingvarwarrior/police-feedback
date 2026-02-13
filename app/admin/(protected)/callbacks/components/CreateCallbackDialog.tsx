'use client'

import { useEffect, useMemo, useState } from "react"
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
import { Plus, Loader2, Search, PhoneCall, UserPlus, XCircle, Star } from "lucide-react"
import { toast } from "sonner"
import { checkCallbackDuplicateByEo, createCallback } from "../actions/callbackActions"

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
  "Коротко опишіть, в чому полягало питання / ситуація, яка стала причиною звернення в поліцію.",
  "Вкажіть ім'я чи будь-яку інформацію щодо співробітника поліції, з яким Ви контактували.",
  "Через який період часу прибув до Вас / відреагував співробітник поліції після звернення?",
  "Це, на Вашу думку, було швидко?",
  "Чи було вирішене Ваше питання?",
  "Який результат?",
  "Що було, на Вашу думку, позитивним у роботі поліцейського?",
  "Було щось, що Вам не сподобалося? Що саме?",
  "Чи запропонував співробітник поліції альтернативні варіанти врегулювання проблеми / питання?",
  "Якщо запропонував альтернативний варіант, то який саме?",
  "Чи вів себе співробітник поліції ввічливо під час реагування на Ваш запит / звернення?",
  "Чи була для Вас результативною робота співробітника поліції, з яким Ви контактували?",
  "Що, з Вашої точки зору, можна поліпшити в роботі співробітника поліції? Додаткові коментарі.",
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
  const [callbackDate, setCallbackDate] = useState(new Date().toISOString().split("T")[0])
  const [situationDescription, setSituationDescription] = useState("")
  const [officerInfo, setOfficerInfo] = useState("")
  const [responseTime, setResponseTime] = useState("")
  const [wasFast, setWasFast] = useState<string>("UNSET")
  const [wasResolved, setWasResolved] = useState<string>("UNSET")
  const [resultText, setResultText] = useState("")
  const [positivePoints, setPositivePoints] = useState("")
  const [negativePoints, setNegativePoints] = useState("")
  const [offeredAlternative, setOfferedAlternative] = useState<string>("UNSET")
  const [alternativeDetails, setAlternativeDetails] = useState("")
  const [wasPolite, setWasPolite] = useState<string>("UNSET")
  const [wasEffective, setWasEffective] = useState<string>("UNSET")
  const [improvements, setImprovements] = useState("")
  const [teamRating, setTeamRating] = useState(0)
  const [isCheckingEo, setIsCheckingEo] = useState(false)
  const [eoDuplicateInfo, setEoDuplicateInfo] = useState<{
    exists: boolean
    count: number
    year: number | null
  }>({ exists: false, count: 0, year: null })
  const isDuplicateBlocked = eoDuplicateInfo.exists

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
    setCallbackDate(new Date().toISOString().split("T")[0])
    setSelectedOfficerIds([])
    setSituationDescription("")
    setOfficerInfo("")
    setResponseTime("")
    setWasFast("UNSET")
    setWasResolved("UNSET")
    setResultText("")
    setPositivePoints("")
    setNegativePoints("")
    setOfferedAlternative("UNSET")
    setAlternativeDetails("")
    setWasPolite("UNSET")
    setWasEffective("UNSET")
    setImprovements("")
    setTeamRating(0)
    setEoDuplicateInfo({ exists: false, count: 0, year: null })
    setIsCheckingEo(false)
    setOfficerQuery("")
  }

  useEffect(() => {
    const eo = eoNumber.trim()
    if (!eo || !callDate) {
      setEoDuplicateInfo({ exists: false, count: 0, year: null })
      setIsCheckingEo(false)
      return
    }

    let cancelled = false
    setIsCheckingEo(true)
    const timer = setTimeout(async () => {
      try {
        const result = await checkCallbackDuplicateByEo({
          eoNumber: eo,
          callDate,
        })
        if (!cancelled) {
          setEoDuplicateInfo({
            exists: Boolean(result.exists),
            count: Number(result.count || 0),
            year: Number(result.year || new Date(callDate).getFullYear()),
          })
        }
      } catch {
        if (!cancelled) {
          setEoDuplicateInfo({ exists: false, count: 0, year: null })
        }
      } finally {
        if (!cancelled) setIsCheckingEo(false)
      }
    }, 350)

    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [eoNumber, callDate])

  const selectedOfficers = useMemo(
    () => officers.filter((o) => selectedOfficerIds.includes(o.id)),
    [officers, selectedOfficerIds]
  )

  const searchResults = useMemo(
    () => filteredOfficers.filter((o) => !selectedOfficerIds.includes(o.id)),
    [filteredOfficers, selectedOfficerIds]
  )

  const handleSubmit = async () => {
    if (isCheckingEo) {
      toast.error("Триває перевірка № ЄО. Зачекайте декілька секунд.")
      return
    }
    if (isDuplicateBlocked) {
      toast.error(`Callback по № ЄО ${eoNumber.trim()} у ${eoDuplicateInfo.year} році вже здійснювався`)
      return
    }
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
      const renderedSurvey = [
        `Дата проведення Callback: ${callbackDate || "—"}`,
        "",
        `1. ${questionItems[0]}`,
        situationDescription || "—",
        "",
        `2. ${questionItems[1]}`,
        officerInfo || "—",
        "",
        `3. ${questionItems[2]}`,
        responseTime || "—",
        "",
        `4. ${questionItems[3]}`,
        wasFast === "YES" ? "так" : wasFast === "NO" ? "ні" : "не вказано",
        "",
        `5. ${questionItems[4]}`,
        wasResolved === "YES" ? "так" : wasResolved === "NO" ? "ні" : "не вказано",
        "",
        `6. ${questionItems[5]}`,
        resultText || "—",
        "",
        `7. ${questionItems[6]}`,
        positivePoints || "—",
        "",
        `8. ${questionItems[7]}`,
        negativePoints || "—",
        "",
        `9. ${questionItems[8]}`,
        offeredAlternative === "YES" ? "так" : offeredAlternative === "NO" ? "ні" : "не вказано",
        "",
        `10. ${questionItems[9]}`,
        alternativeDetails || "—",
        "",
        `11. ${questionItems[10]}`,
        wasPolite === "YES" ? "так" : wasPolite === "NO" ? "ні" : "не вказано",
        "",
        `12. ${questionItems[11]}`,
        wasEffective === "YES" ? "так" : wasEffective === "NO" ? "ні" : "не вказано",
        "",
        `13. ${questionItems[12]}`,
        improvements || "—",
        "",
        `Оцінка роботи наряду (1-5): ${teamRating > 0 ? teamRating : "не вказано"}`,
      ].join("\n")

      await createCallback({
        callDate,
        eoNumber,
        applicantName,
        applicantPhone,
        officerIds: selectedOfficerIds,
        qOverall: teamRating > 0 ? teamRating : undefined,
        surveyNotes: renderedSurvey,
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
              <Input
                value={eoNumber}
                onChange={(e) => setEoNumber(e.target.value)}
                placeholder="Напр. 1245"
                className={eoDuplicateInfo.exists ? "border-amber-400 focus-visible:ring-amber-200" : ""}
              />
              {isCheckingEo && (
                <p className="text-[11px] font-semibold text-slate-400">Перевіряємо № ЄО у реєстрі...</p>
              )}
              {!isCheckingEo && eoDuplicateInfo.exists && (
                <p className="text-[11px] font-bold text-amber-700">
                  Callback по № ЄО {eoNumber.trim()} у {eoDuplicateInfo.year} році вже здійснювався ({eoDuplicateInfo.count}).
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label>ПІБ заявника</Label>
              <Input
                value={applicantName}
                onChange={(e) => setApplicantName(e.target.value)}
                placeholder="Прізвище Ім'я По батькові"
                disabled={isDuplicateBlocked}
              />
            </div>
            <div className="space-y-2">
              <Label>Номер телефону заявника</Label>
              <Input
                value={applicantPhone}
                onChange={(e) => setApplicantPhone(e.target.value)}
                placeholder="+380..."
                disabled={isDuplicateBlocked}
              />
            </div>
          </div>

          <fieldset
            disabled={isDuplicateBlocked}
            className={`space-y-3 rounded-2xl border border-slate-200 p-4 ${isDuplicateBlocked ? "opacity-60" : ""}`}
          >
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
          </fieldset>

          <fieldset
            disabled={isDuplicateBlocked}
            className={`space-y-3 rounded-2xl border border-blue-200 bg-blue-50/40 p-4 ${isDuplicateBlocked ? "opacity-60" : ""}`}
          >
            <h3 className="text-xs font-black uppercase tracking-widest text-blue-700">Питання для опитування заявника</h3>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="font-semibold text-slate-700">Дата проведення Callback</Label>
                <Input type="date" value={callbackDate} onChange={(e) => setCallbackDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label className="font-semibold text-slate-700">1. {questionItems[0]}</Label>
                <Textarea value={situationDescription} onChange={(e) => setSituationDescription(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label className="font-semibold text-slate-700">2. {questionItems[1]}</Label>
                <Textarea value={officerInfo} onChange={(e) => setOfficerInfo(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label className="font-semibold text-slate-700">3. {questionItems[2]}</Label>
                <Input value={responseTime} onChange={(e) => setResponseTime(e.target.value)} placeholder="Напр. через 12 хвилин" />
              </div>
              <div className="space-y-2">
                <Label className="font-semibold text-slate-700">4. {questionItems[3]}</Label>
                <Select value={wasFast} onValueChange={setWasFast}>
                  <SelectTrigger><SelectValue placeholder="Оберіть відповідь" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="UNSET">Не вказано</SelectItem>
                    <SelectItem value="YES">Так</SelectItem>
                    <SelectItem value="NO">Ні</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="font-semibold text-slate-700">5. {questionItems[4]}</Label>
                <Select value={wasResolved} onValueChange={setWasResolved}>
                  <SelectTrigger><SelectValue placeholder="Оберіть відповідь" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="UNSET">Не вказано</SelectItem>
                    <SelectItem value="YES">Так</SelectItem>
                    <SelectItem value="NO">Ні</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="font-semibold text-slate-700">6. {questionItems[5]}</Label>
                <Textarea value={resultText} onChange={(e) => setResultText(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label className="font-semibold text-slate-700">7. {questionItems[6]}</Label>
                <Textarea value={positivePoints} onChange={(e) => setPositivePoints(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label className="font-semibold text-slate-700">8. {questionItems[7]}</Label>
                <Textarea value={negativePoints} onChange={(e) => setNegativePoints(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label className="font-semibold text-slate-700">9. {questionItems[8]}</Label>
                <Select value={offeredAlternative} onValueChange={setOfferedAlternative}>
                  <SelectTrigger><SelectValue placeholder="Оберіть відповідь" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="UNSET">Не вказано</SelectItem>
                    <SelectItem value="YES">Так</SelectItem>
                    <SelectItem value="NO">Ні</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="font-semibold text-slate-700">10. {questionItems[9]}</Label>
                <Textarea value={alternativeDetails} onChange={(e) => setAlternativeDetails(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label className="font-semibold text-slate-700">11. {questionItems[10]}</Label>
                <Select value={wasPolite} onValueChange={setWasPolite}>
                  <SelectTrigger><SelectValue placeholder="Оберіть відповідь" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="UNSET">Не вказано</SelectItem>
                    <SelectItem value="YES">Так</SelectItem>
                    <SelectItem value="NO">Ні</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="font-semibold text-slate-700">12. {questionItems[11]}</Label>
                <Select value={wasEffective} onValueChange={setWasEffective}>
                  <SelectTrigger><SelectValue placeholder="Оберіть відповідь" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="UNSET">Не вказано</SelectItem>
                    <SelectItem value="YES">Так</SelectItem>
                    <SelectItem value="NO">Ні</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="font-semibold text-slate-700">13. {questionItems[12]}</Label>
                <Textarea value={improvements} onChange={(e) => setImprovements(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label className="font-semibold text-slate-700">Оцініть, будь ласка, роботу наряду (від 1 до 5)</Label>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((rating) => (
                    <button
                      key={rating}
                      type="button"
                      onClick={() => setTeamRating((prev) => (prev === rating ? 0 : rating))}
                      className="rounded-lg p-1 hover:bg-amber-50"
                      aria-label={`Оцінка ${rating}`}
                    >
                      <Star
                        className={`h-7 w-7 ${rating <= teamRating ? "fill-amber-400 text-amber-500" : "text-slate-300"}`}
                      />
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setTeamRating(0)}
                    className="ml-2 rounded-lg border border-slate-200 px-2 py-1 text-xs font-bold text-slate-500 hover:bg-slate-50"
                  >
                    Очистити
                  </button>
                </div>
              </div>
            </div>
          </fieldset>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)} className="rounded-xl">Скасувати</Button>
          <Button
            onClick={handleSubmit}
            disabled={isLoading || isCheckingEo || isDuplicateBlocked}
            className="rounded-xl"
          >
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Зберегти callback
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
