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
  "Коротко: з яким питанням Ви звертались? (1 речення)",
  "Коли звертались? (дата/час)",
  "Знаєте, хто реагував? (ПІБ/жетон/екіпаж/не знаю)",
  "Час очікування на реакцію/прибуття",
  "Результат звернення",
  "Оцініть роботу (1-5): ввічливість / ефективність",
  "Один коментар: що було найкраще або що потрібно поліпшити? (1-2 речення)",
  "Що саме не сподобалось? (час / спілкування / дії / пояснення / інше)",
  "Чи пропонували альтернативний варіант вирішення? так/ні — якщо так, який?",
] as const

const waitTimeOptions = [
  { value: "UP_TO_10", label: "до 10 хв" },
  { value: "MIN_10_30", label: "10–30 хв" },
  { value: "MIN_30_60", label: "30–60 хв" },
  { value: "OVER_60", label: "понад 60 хв" },
  { value: "NO_RESPONSE", label: "не реагували" },
] as const

const resultOptions = [
  { value: "RESOLVED", label: "вирішено" },
  { value: "PARTIAL", label: "частково" },
  { value: "NOT_RESOLVED", label: "не вирішено" },
] as const

const dislikedOptions = [
  { value: "TIME", label: "час" },
  { value: "COMMUNICATION", label: "спілкування" },
  { value: "ACTIONS", label: "дії" },
  { value: "EXPLANATION", label: "пояснення" },
  { value: "OTHER", label: "інше" },
] as const

function mapWaitTimeLabel(value: string) {
  return waitTimeOptions.find((item) => item.value === value)?.label || "не вказано"
}

function mapResultLabel(value: string) {
  return resultOptions.find((item) => item.value === value)?.label || "не вказано"
}

export default function CreateCallbackDialog({ officers }: Props) {
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [officerQuery, setOfficerQuery] = useState("")

  const [callDate, setCallDate] = useState(new Date().toISOString().split("T")[0])
  const [eoNumber, setEoNumber] = useState("")
  const [applicantName, setApplicantName] = useState("")
  const [applicantPhone, setApplicantPhone] = useState("")
  const [selectedOfficerIds, setSelectedOfficerIds] = useState<string[]>([])
  const [whenContacted, setWhenContacted] = useState("")
  const [issueSummary, setIssueSummary] = useState("")
  const [responderInfo, setResponderInfo] = useState("")
  const [waitTimeBucket, setWaitTimeBucket] = useState<string>("UNSET")
  const [caseResult, setCaseResult] = useState<string>("UNSET")
  const [politenessRating, setPolitenessRating] = useState(0)
  const [effectivenessRating, setEffectivenessRating] = useState(0)
  const [singleComment, setSingleComment] = useState("")
  const [dislikedReasons, setDislikedReasons] = useState<string[]>([])
  const [dislikedOtherText, setDislikedOtherText] = useState("")
  const [offeredAlternative, setOfferedAlternative] = useState<string>("UNSET")
  const [alternativeDetails, setAlternativeDetails] = useState("")
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
    setWhenContacted("")
    setIssueSummary("")
    setResponderInfo("")
    setWaitTimeBucket("UNSET")
    setCaseResult("UNSET")
    setPolitenessRating(0)
    setEffectivenessRating(0)
    setSingleComment("")
    setDislikedReasons([])
    setDislikedOtherText("")
    setSelectedOfficerIds([])
    setOfferedAlternative("UNSET")
    setAlternativeDetails("")
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

  const lowRating = (politenessRating > 0 && politenessRating <= 2) || (effectivenessRating > 0 && effectivenessRating <= 2)
  const needClarification = caseResult === "PARTIAL" || caseResult === "NOT_RESOLVED" || lowRating

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
      const dislikedText = dislikedReasons.length
        ? dislikedReasons
            .map((reason) => dislikedOptions.find((item) => item.value === reason)?.label || reason)
            .join(", ")
        : "не вказано"

      const averageRating =
        politenessRating > 0 && effectivenessRating > 0
          ? Math.round((politenessRating + effectivenessRating) / 2)
          : politenessRating > 0
            ? politenessRating
            : effectivenessRating > 0
              ? effectivenessRating
              : 0

      const renderedSurvey = [
        `1. ${questionItems[0]}`,
        issueSummary || "—",
        "",
        `2. ${questionItems[1]}`,
        whenContacted || "—",
        "",
        `3. ${questionItems[2]}`,
        responderInfo || "—",
        "",
        `4. ${questionItems[3]}`,
        mapWaitTimeLabel(waitTimeBucket),
        "",
        `5. ${questionItems[4]}`,
        mapResultLabel(caseResult),
        "",
        `6. ${questionItems[5]}`,
        `ввічливість: ${politenessRating > 0 ? politenessRating : "не вказано"}, ефективність: ${effectivenessRating > 0 ? effectivenessRating : "не вказано"}`,
        "",
        `7. ${questionItems[6]}`,
        singleComment || "—",
      ]

      if (needClarification) {
        renderedSurvey.push(
          "",
          `8. ${questionItems[7]}`,
          dislikedText + (dislikedReasons.includes("OTHER") && dislikedOtherText.trim() ? ` (інше: ${dislikedOtherText.trim()})` : ""),
          "",
          `9. ${questionItems[8]}`,
          offeredAlternative === "YES" ? "так" : offeredAlternative === "NO" ? "ні" : "не вказано",
          offeredAlternative === "YES" ? (alternativeDetails || "—") : "—",
        )
      }

      renderedSurvey.push(
        "",
        `Підсумкова оцінка (1-5): ${averageRating > 0 ? averageRating : "не вказано"}`,
      )

      await createCallback({
        callDate,
        eoNumber,
        applicantName,
        applicantPhone,
        officerIds: selectedOfficerIds,
        qPoliteness: politenessRating > 0 ? politenessRating : undefined,
        qProfessionalism: effectivenessRating > 0 ? effectivenessRating : undefined,
        qOverall: averageRating > 0 ? averageRating : undefined,
        surveyNotes: renderedSurvey.join("\n"),
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
      <DialogContent className="max-h-[92dvh] max-w-4xl overflow-hidden rounded-3xl p-0">
        <DialogHeader className="border-b border-slate-200 bg-white px-6 py-5">
          <DialogTitle className="flex items-center gap-2 text-xl font-semibold tracking-tight">
            <PhoneCall className="h-5 w-5 text-blue-500" />
            Нова callback-картка
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 space-y-4 overflow-y-auto px-6 py-5">
          <details open className="rounded-2xl border border-slate-200 bg-white">
            <summary className="cursor-pointer list-none rounded-2xl px-4 py-3 text-sm font-semibold text-slate-900">
              1. Дані виклику та заявника
            </summary>
            <div className="space-y-4 border-t border-slate-100 px-4 py-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label className="ds-field-label">Дата виклику</Label>
                  <Input type="date" value={callDate} onChange={(e) => setCallDate(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label className="ds-field-label">№ ЄО виклику</Label>
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
                    <p className="text-[11px] font-semibold text-amber-700">
                      Callback по № ЄО {eoNumber.trim()} у {eoDuplicateInfo.year} році вже здійснювався ({eoDuplicateInfo.count}).
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label className="ds-field-label">ПІБ заявника</Label>
                  <Input
                    value={applicantName}
                    onChange={(e) => setApplicantName(e.target.value)}
                    placeholder="Прізвище Ім'я По батькові"
                    disabled={isDuplicateBlocked}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="ds-field-label">Номер телефону заявника</Label>
                  <Input
                    value={applicantPhone}
                    onChange={(e) => setApplicantPhone(e.target.value)}
                    placeholder="+380..."
                    disabled={isDuplicateBlocked}
                  />
                </div>
              </div>
            </div>
          </details>

          <details open className={`rounded-2xl border border-slate-200 bg-white ${isDuplicateBlocked ? "opacity-60" : ""}`}>
            <summary className="cursor-pointer list-none rounded-2xl px-4 py-3 text-sm font-semibold text-slate-900">
              2. Поліцейські, яких стосується callback
            </summary>
            <fieldset
              disabled={isDuplicateBlocked}
              className="space-y-3 border-t border-slate-100 px-4 py-4"
            >
              {selectedOfficers.length > 0 && (
                <div className="mb-2 flex flex-wrap gap-2">
                  {selectedOfficers.map((o) => (
                    <div key={o.id} className="flex items-center gap-2 rounded-xl border border-blue-100 bg-blue-50 px-3 py-1.5 text-[11px] font-semibold text-blue-700">
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
                        <p className="text-sm font-semibold text-slate-900">{fullName}</p>
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
          </details>

          <details open className={`rounded-2xl border border-blue-200 bg-blue-50/40 ${isDuplicateBlocked ? "opacity-60" : ""}`}>
            <summary className="cursor-pointer list-none rounded-2xl px-4 py-3 text-sm font-semibold text-blue-900">
              3. Опитування заявника
            </summary>
            <fieldset
              disabled={isDuplicateBlocked}
              className="space-y-4 border-t border-blue-100 px-4 py-4"
            >
              <div className="space-y-2">
                <Label className="font-semibold text-slate-700">1. {questionItems[0]}</Label>
                <Input value={issueSummary} onChange={(e) => setIssueSummary(e.target.value)} placeholder="Коротко, одним реченням" />
              </div>
              <div className="space-y-2">
                <Label className="font-semibold text-slate-700">2. {questionItems[1]}</Label>
                <Input type="datetime-local" value={whenContacted} onChange={(e) => setWhenContacted(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label className="font-semibold text-slate-700">3. {questionItems[2]}</Label>
                <Input value={responderInfo} onChange={(e) => setResponderInfo(e.target.value)} placeholder="ПІБ / жетон / екіпаж / не знаю" />
              </div>
              <div className="space-y-2">
                <Label className="font-semibold text-slate-700">4. {questionItems[3]}</Label>
                <Select value={waitTimeBucket} onValueChange={setWaitTimeBucket}>
                  <SelectTrigger><SelectValue placeholder="Оберіть варіант" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="UNSET">Не вказано</SelectItem>
                    {waitTimeOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="font-semibold text-slate-700">5. {questionItems[4]}</Label>
                <Select value={caseResult} onValueChange={setCaseResult}>
                  <SelectTrigger><SelectValue placeholder="Оберіть варіант" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="UNSET">Не вказано</SelectItem>
                    {resultOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-3 rounded-xl border border-amber-100 bg-amber-50/40 p-3">
                <Label className="font-semibold text-slate-700">6. {questionItems[5]}</Label>
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-slate-600">Ввічливість</p>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((rating) => (
                      <button
                        key={`polite-${rating}`}
                        type="button"
                        onClick={() => setPolitenessRating((prev) => (prev === rating ? 0 : rating))}
                        className="rounded-lg p-1 hover:bg-amber-100"
                        aria-label={`Ввічливість ${rating}`}
                      >
                        <Star className={`h-7 w-7 ${rating <= politenessRating ? "fill-amber-400 text-amber-500" : "text-slate-300"}`} />
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-slate-600">Ефективність</p>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((rating) => (
                      <button
                        key={`effective-${rating}`}
                        type="button"
                        onClick={() => setEffectivenessRating((prev) => (prev === rating ? 0 : rating))}
                        className="rounded-lg p-1 hover:bg-amber-100"
                        aria-label={`Ефективність ${rating}`}
                      >
                        <Star className={`h-7 w-7 ${rating <= effectivenessRating ? "fill-amber-400 text-amber-500" : "text-slate-300"}`} />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="font-semibold text-slate-700">7. {questionItems[6]}</Label>
                <Textarea value={singleComment} onChange={(e) => setSingleComment(e.target.value)} />
              </div>

              {needClarification && (
                <>
                  <div className="space-y-2">
                    <Label className="font-semibold text-slate-700">8. {questionItems[7]}</Label>
                    <div className="flex flex-wrap gap-2">
                      {dislikedOptions.map((option) => {
                        const selected = dislikedReasons.includes(option.value)
                        return (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() => {
                              setDislikedReasons((prev) =>
                                prev.includes(option.value)
                                  ? prev.filter((item) => item !== option.value)
                                  : [...prev, option.value]
                              )
                            }}
                            className={`rounded-xl border px-3 py-1.5 text-xs font-semibold transition ${
                              selected
                                ? "border-amber-300 bg-amber-100 text-amber-800"
                                : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                            }`}
                          >
                            {option.label}
                          </button>
                        )
                      })}
                    </div>
                    {dislikedReasons.includes("OTHER") && (
                      <Input
                        value={dislikedOtherText}
                        onChange={(e) => setDislikedOtherText(e.target.value)}
                        placeholder="Уточніть: що саме не сподобалось"
                      />
                    )}
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
                    {offeredAlternative === "YES" && (
                      <Textarea
                        value={alternativeDetails}
                        onChange={(e) => setAlternativeDetails(e.target.value)}
                        placeholder="Який саме альтернативний варіант запропонували?"
                      />
                    )}
                  </div>
                </>
              )}
            </fieldset>
          </details>
        </div>

        <DialogFooter className="sticky-modal-footer flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end">
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
