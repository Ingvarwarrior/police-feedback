"use client"

import { useState, useRef, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Textarea } from "@/components/ui/textarea"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { format, parseISO, isValid } from "date-fns"
import { uk } from "date-fns/locale"
import { CalendarIcon, Plus, Loader2, Edit2, Sparkles, Image as ImageIcon, Search, UserPlus, XCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { upsertUnifiedRecordAction } from "../actions/recordActions"
import { analyzeRecordImageAction } from "../actions/aiActions"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
    forceLabels,
    formatOfficerForRaport,
    getInitialLegalBasis,
    getInitialForceUsage,
    type ForceKey,
    type ForceUsage,
    type LegalBasisState,
} from "./unifiedRecord.helpers"
import {
    buildProtocolSummary,
    buildRaportForceDescription,
    buildRaportLegalAddress,
    DEFAULT_DETENTION_MATERIALS,
    DEFAULT_DETENTION_PURPOSE,
    parseDetentionProtocolValue,
} from "./createRecordDialog.viewmodel"

const formSchema = z.object({
    id: z.string().optional(),
    eoNumber: z.string().optional(),
    eoDate: z.date(),
    description: z.string().optional(),
    applicant: z.string().optional(),
    address: z.string().optional(),
    officerName: z.string().optional(),
    assignedUserId: z.string().optional().nullable(),
    officerIds: z.array(z.string()).optional(),
    category: z.string().optional(),
    recordType: z.string().min(1),
    district: z.string().optional(),
    resolution: z.string().optional(),
    resolutionDate: z.date().optional().nullable(),
    investigationDocType: z.string().optional().nullable(),
    investigationTargetType: z.string().optional().nullable(),
    investigationTargetText: z.string().optional().nullable(),
    investigationViolation: z.string().optional().nullable(),
    investigationStage: z.string().optional().nullable(),
    investigationReviewResult: z.string().optional().nullable(),
    investigationOrderNumber: z.string().optional().nullable(),
    investigationOrderDate: z.date().optional().nullable(),
    investigationFinalResult: z.string().optional().nullable(),
    investigationPenaltyType: z.string().optional().nullable(),
    investigationPenaltyOther: z.string().optional().nullable(),
    investigationPenaltyOfficerId: z.string().optional().nullable(),
    investigationPenaltyItems: z.string().optional().nullable(),
    investigationConclusionApprovedAt: z.date().optional().nullable(),
    investigationPenaltyByArticle13: z.boolean().optional().nullable(),
    investigationPenaltyOrderNumber: z.string().optional().nullable(),
    investigationPenaltyOrderDate: z.date().optional().nullable(),
})

type FormValues = z.infer<typeof formSchema>

interface CreateRecordDialogProps {
    initialData?: Partial<FormValues>
    users?: { id: string, firstName: string | null, lastName: string | null, username: string }[]
    lockRecordType?: boolean
    trigger?: React.ReactNode
}

export default function CreateRecordDialog({ initialData, users = [], lockRecordType = false, trigger }: CreateRecordDialogProps) {
    const [isOpen, setIsOpen] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [isAnalyzing, setIsAnalyzing] = useState(false)
    const [taggedOfficers, setTaggedOfficers] = useState<any[]>((initialData as any)?.officers || [])
    const [officerSearchQuery, setOfficerSearchQuery] = useState("")
    const [officerSearchResults, setOfficerSearchResults] = useState<any[]>([])
    const [isSearchingOfficers, setIsSearchingOfficers] = useState(false)
    const [forceUsage, setForceUsage] = useState<ForceUsage>(getInitialForceUsage())
    const [subjectFullName, setSubjectFullName] = useState("")
    const [subjectBirthDate, setSubjectBirthDate] = useState("")
    const [legalBasis, setLegalBasis] = useState<LegalBasisState>(getInitialLegalBasis())
    const [protocolPrepared, setProtocolPrepared] = useState<"YES" | "NO" | "">("")
    const [protocolNoReason, setProtocolNoReason] = useState("")
    const [protocolSeries, setProtocolSeries] = useState("")
    const [protocolNumber, setProtocolNumber] = useState("")
    const [protocolDate, setProtocolDate] = useState("")
    const [detentionFromDate, setDetentionFromDate] = useState("")
    const [detentionFromTime, setDetentionFromTime] = useState("")
    const [detentionToDate, setDetentionToDate] = useState("")
    const [detentionToTime, setDetentionToTime] = useState("")
    const [detentionPurpose, setDetentionPurpose] = useState(DEFAULT_DETENTION_PURPOSE)
    const [detentionMaterials, setDetentionMaterials] = useState(DEFAULT_DETENTION_MATERIALS)
    const [applicationBirthDate, setApplicationBirthDate] = useState("")
    const [detentionProtocolSeries, setDetentionProtocolSeries] = useState("")
    const [detentionProtocolNumber, setDetentionProtocolNumber] = useState("")
    const [siDocType, setSiDocType] = useState<"RAPORT" | "DOPOVIDNA">("RAPORT")
    const [siTargetMode, setSiTargetMode] = useState<"OFFICERS" | "BPP">("OFFICERS")
    const [siTargetText, setSiTargetText] = useState("поліцейських БПП")
    const [siViolation, setSiViolation] = useState("")
    const autoOfficerNameRef = useRef("")
    const autoAddressRef = useRef("")
    const autoApplicantRef = useRef("")
    const fileInputRef = useRef<HTMLInputElement>(null)

    const isEdit = !!initialData?.id

    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            id: initialData?.id,
            eoNumber: initialData?.eoNumber || "",
            eoDate: initialData?.eoDate ? new Date(initialData.eoDate) : new Date(),
            description: initialData?.description || "",
            applicant: initialData?.applicant || "",
            address: initialData?.address || "",
            officerName: initialData?.officerName || "",
            assignedUserId: initialData?.assignedUserId || null,
            officerIds: (initialData as any)?.officers?.map((o: any) => o.id) || [],
            category: initialData?.category || "Загальне",
            recordType: initialData?.recordType || "EO",
            district: initialData?.district || "Хмільницький",
            resolution: initialData?.resolution || "",
            resolutionDate: initialData?.resolutionDate ? new Date(initialData.resolutionDate) : null,
            investigationDocType: (initialData as any)?.investigationDocType || null,
            investigationTargetType: (initialData as any)?.investigationTargetType || null,
            investigationTargetText: (initialData as any)?.investigationTargetText || null,
            investigationViolation: (initialData as any)?.investigationViolation || null,
            investigationStage: (initialData as any)?.investigationStage || null,
            investigationReviewResult: (initialData as any)?.investigationReviewResult || null,
            investigationOrderNumber: (initialData as any)?.investigationOrderNumber || null,
            investigationOrderDate: (initialData as any)?.investigationOrderDate ? new Date((initialData as any).investigationOrderDate) : null,
            investigationFinalResult: (initialData as any)?.investigationFinalResult || null,
            investigationPenaltyType: (initialData as any)?.investigationPenaltyType || null,
            investigationPenaltyOther: (initialData as any)?.investigationPenaltyOther || null,
            investigationPenaltyOfficerId: (initialData as any)?.investigationPenaltyOfficerId || null,
            investigationPenaltyItems: (initialData as any)?.investigationPenaltyItems || null,
            investigationConclusionApprovedAt: (initialData as any)?.investigationConclusionApprovedAt ? new Date((initialData as any).investigationConclusionApprovedAt) : null,
            investigationPenaltyByArticle13: typeof (initialData as any)?.investigationPenaltyByArticle13 === "boolean" ? (initialData as any).investigationPenaltyByArticle13 : null,
            investigationPenaltyOrderNumber: (initialData as any)?.investigationPenaltyOrderNumber || null,
            investigationPenaltyOrderDate: (initialData as any)?.investigationPenaltyOrderDate ? new Date((initialData as any).investigationPenaltyOrderDate) : null,
        },
    })

    // Reset form only when dialog opens.
    // Do not reset on every parent re-render (it clears user input mid-typing).
    useEffect(() => {
        if (!isOpen) return

        form.reset({
            id: initialData?.id,
            eoNumber: initialData?.eoNumber || "",
            eoDate: initialData?.eoDate ? new Date(initialData.eoDate) : new Date(),
            description: initialData?.description || "",
            applicant: initialData?.applicant || "",
            address: initialData?.address || "",
            officerName: initialData?.officerName || "",
            assignedUserId: initialData?.assignedUserId || null,
            officerIds: (initialData as any)?.officers?.map((o: any) => o.id) || [],
            category: initialData?.category || "Загальне",
            recordType: initialData?.recordType || "EO",
            district: initialData?.district || "Хмільницький",
            resolution: initialData?.resolution || "",
            resolutionDate: initialData?.resolutionDate ? new Date(initialData.resolutionDate) : null,
            investigationDocType: (initialData as any)?.investigationDocType || null,
            investigationTargetType: (initialData as any)?.investigationTargetType || null,
            investigationTargetText: (initialData as any)?.investigationTargetText || null,
            investigationViolation: (initialData as any)?.investigationViolation || null,
            investigationStage: (initialData as any)?.investigationStage || null,
            investigationReviewResult: (initialData as any)?.investigationReviewResult || null,
            investigationOrderNumber: (initialData as any)?.investigationOrderNumber || null,
            investigationOrderDate: (initialData as any)?.investigationOrderDate ? new Date((initialData as any).investigationOrderDate) : null,
            investigationFinalResult: (initialData as any)?.investigationFinalResult || null,
            investigationPenaltyType: (initialData as any)?.investigationPenaltyType || null,
            investigationPenaltyOther: (initialData as any)?.investigationPenaltyOther || null,
            investigationPenaltyOfficerId: (initialData as any)?.investigationPenaltyOfficerId || null,
            investigationPenaltyItems: (initialData as any)?.investigationPenaltyItems || null,
            investigationConclusionApprovedAt: (initialData as any)?.investigationConclusionApprovedAt ? new Date((initialData as any).investigationConclusionApprovedAt) : null,
            investigationPenaltyByArticle13: typeof (initialData as any)?.investigationPenaltyByArticle13 === "boolean" ? (initialData as any).investigationPenaltyByArticle13 : null,
            investigationPenaltyOrderNumber: (initialData as any)?.investigationPenaltyOrderNumber || null,
            investigationPenaltyOrderDate: (initialData as any)?.investigationPenaltyOrderDate ? new Date((initialData as any).investigationPenaltyOrderDate) : null,
        })
    }, [isOpen, form, initialData?.id])

    const eoDate = form.watch("eoDate")
    const recordType = form.watch("recordType")

    const updateForceUsage = (key: ForceKey, patch: Partial<ForceUsage[ForceKey]>) => {
        setForceUsage(prev => ({
            ...prev,
            [key]: { ...prev[key], ...patch }
        }))
    }

    const onAiScan = () => {
        const input = fileInputRef.current
        if (!input) return
        try {
            if (typeof input.showPicker === "function") {
                input.showPicker()
                return
            }
            input.click()
        } catch {
            try {
                input.click()
            } catch {
                toast.error("Не вдалося відкрити камеру. Перевірте дозволи браузера.")
            }
        }
    }

    const resizeImage = (base64Str: string): Promise<string> => {
        return new Promise((resolve) => {
            const img = new Image()
            img.src = base64Str
            img.onload = () => {
                const canvas = document.createElement('canvas')
                const MAX_WIDTH = 1024
                const MAX_HEIGHT = 1024
                let width = img.width
                let height = img.height

                if (width > height) {
                    if (width > MAX_WIDTH) {
                        height *= MAX_WIDTH / width
                        width = MAX_WIDTH
                    }
                } else {
                    if (height > MAX_HEIGHT) {
                        width *= MAX_HEIGHT / height
                        height = MAX_HEIGHT
                    }
                }

                canvas.width = width
                canvas.height = height
                const ctx = canvas.getContext('2d')
                ctx?.drawImage(img, 0, 0, width, height)
                resolve(canvas.toDataURL('image/jpeg', 0.8)) // 0.8 quality or lower to save tokens
            }
        })
    }

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        if (!file.type.startsWith('image/')) {
            toast.error("Будь ласка, оберіть зображення")
            return
        }

        setIsAnalyzing(true)
        const toastId = toast.loading("ШІ аналізує фото...")

        try {
            const reader = new FileReader()
            reader.onloadend = async () => {
                const base64 = reader.result as string
                const optimizedBase64 = await resizeImage(base64)
                const result = await analyzeRecordImageAction(optimizedBase64)

                if (result.success && result.data) {
                    const data = result.data

                    // Populate form fields
                    if (data.eoNumber) form.setValue("eoNumber", data.eoNumber)
                    if (data.description) form.setValue("description", data.description)
                    if (data.applicant) form.setValue("applicant", data.applicant)
                    if (data.address) form.setValue("address", data.address)
                    if (data.category) form.setValue("category", data.category)

                    if (data.eoDate) {
                        const parsedDate = parseISO(data.eoDate)
                        if (isValid(parsedDate)) {
                            form.setValue("eoDate", parsedDate)
                        }
                    }

                    toast.success("Дані успішно розпізнано!", { id: toastId })
                } else {
                    toast.error(result.error || "Не вдалося розпізнати дані", { id: toastId })
                }
                setIsAnalyzing(false)
            }
            reader.readAsDataURL(file)
        } catch (error) {
            toast.error("Помилка при обробці файлу", { id: toastId })
            setIsAnalyzing(false)
        }

        // Reset input
        e.target.value = ''
    }

    const onSubmit = async (data: FormValues) => {
        setIsLoading(true)
        try {
            if (data.recordType !== "RAPORT" && data.recordType !== "APPLICATION" && data.recordType !== "DETENTION_PROTOCOL" && data.recordType !== "SERVICE_INVESTIGATION" && !data.eoNumber?.trim()) {
                toast.error('Поле "Номер ЄО" є обовʼязковим')
                return
            }

            if ((data.recordType === "EO" || data.recordType === "ZVERN") && !data.description?.trim()) {
                toast.error('Поле "Подія" є обовʼязковим')
                return
            }

            let raportDescription = data.description || ""
            let payloadAddress = data.address
            let payloadCategory = data.category
            let payloadEoNumber = data.eoNumber
            let payloadConcernsBpp = true
            let payloadOfficerIds = taggedOfficers.map((o: any) => o.id)
            let payloadInvestigation: Record<string, any> = {}
            if (data.recordType === "RAPORT") {
                if (!data.officerName?.trim()) {
                    toast.error('Поле "Ким застосовано..." є обовʼязковим')
                    return
                }
                if (!subjectFullName.trim()) {
                    toast.error('Вкажіть ПІБ особи, до якої застосовано')
                    return
                }
                if (!subjectBirthDate) {
                    toast.error('Вкажіть дату народження особи, до якої застосовано')
                    return
                }
                if (!Object.values(legalBasis).some(Boolean)) {
                    toast.error('Оберіть щонайменше одну правову підставу (ст.44/45)')
                    return
                }
                const forceDescription = buildRaportForceDescription(forceUsage)
                if (forceDescription.error) {
                    toast.error(forceDescription.error)
                    return
                }
                if (!data.address?.trim()) {
                    toast.error('Поле "Підстава застосування..." є обовʼязковим')
                    return
                }
                if (!data.applicant?.trim()) {
                    toast.error('Поле "Дані про оформлення протоколу..." є обовʼязковим')
                    return
                }
                if (!protocolPrepared) {
                    toast.error('Вкажіть, чи складався протокол затримання')
                    return
                }
                if (protocolPrepared === "NO" && !protocolNoReason.trim()) {
                    toast.error('Для варіанту "НІ" вкажіть причину застосування')
                    return
                }
                if (protocolPrepared === "YES") {
                    if (!protocolSeries.trim() || !protocolNumber.trim() || !protocolDate) {
                        toast.error('Для протоколу "ТАК" вкажіть серію, номер і дату')
                        return
                    }
                    if (!detentionFromDate || !detentionFromTime || !detentionToDate || !detentionToTime) {
                        toast.error('Для протоколу "ТАК" вкажіть повний період затримання (з/до)')
                        return
                    }
                    if (!detentionPurpose.trim()) {
                        toast.error('Вкажіть мету затримання')
                        return
                    }
                    if (!detentionMaterials.trim()) {
                        toast.error('Вкажіть, які матеріали складалися')
                        return
                    }
                }

                raportDescription = forceDescription.description
            }

            if (data.recordType === "SERVICE_INVESTIGATION") {
                if (!data.eoNumber?.trim()) {
                    toast.error('Поле "Номер рапорту/доповідної" є обовʼязковим')
                    return
                }
                if (!siViolation.trim()) {
                    toast.error('Поле "Яке порушення" є обовʼязковим')
                    return
                }
                if (siTargetMode === "OFFICERS" && taggedOfficers.length === 0) {
                    toast.error('Оберіть хоча б одного поліцейського або перемкніться на "поліцейських БПП"')
                    return
                }

                const targetText = siTargetMode === "BPP"
                    ? (siTargetText.trim() || "поліцейських БПП")
                    : taggedOfficers
                        .map((o: any) => `${o.lastName || ""} ${o.firstName || ""}`.trim())
                        .filter(Boolean)
                        .join(", ")

                raportDescription = siViolation.trim()
                payloadAddress = targetText
                payloadCategory = "Службові розслідування"
                payloadConcernsBpp = siTargetMode === "BPP"
                payloadOfficerIds = siTargetMode === "BPP" ? [] : taggedOfficers.map((o: any) => o.id)

                payloadInvestigation = {
                    investigationDocType: siDocType,
                    investigationTargetType: siTargetMode,
                    investigationTargetText: targetText,
                    investigationViolation: siViolation.trim(),
                    investigationStage: (initialData as any)?.investigationStage || "REPORT_REVIEW",
                }

                data.applicant = targetText
            }

            if (data.recordType === "APPLICATION") {
                if (!data.applicant?.trim()) {
                    toast.error('Поле "ПІБ до кого застосовано" є обовʼязковим')
                    return
                }
                if (!applicationBirthDate) {
                    toast.error('Поле "Дата народження" є обовʼязковим')
                    return
                }
                raportDescription = "Застосування сили/спецзасобів"
                payloadAddress = `DOB:${applicationBirthDate}`
                payloadCategory = "Застосування сили/спецзасобів"
            }

            if (data.recordType === "DETENTION_PROTOCOL") {
                if (!detentionProtocolSeries.trim()) {
                    toast.error('Поле "СЕРІЯ ПРОТОКОЛУ затримання" є обовʼязковим')
                    return
                }
                if (!detentionProtocolNumber.trim()) {
                    toast.error('Поле "№ ПРОТОКОЛУ затримання" є обовʼязковим')
                    return
                }
                if (!data.applicant?.trim()) {
                    toast.error('Поле "ПІБ кого затримали" є обовʼязковим')
                    return
                }
                if (!applicationBirthDate) {
                    toast.error('Поле "Дата народження" є обовʼязковим')
                    return
                }
                payloadEoNumber = `Серія ${detentionProtocolSeries.trim()} №${detentionProtocolNumber.trim()}`
                raportDescription = "Протокол затримання"
                payloadAddress = `DOB:${applicationBirthDate}`
                payloadCategory = "Протоколи затримання"
            }

            const result = await upsertUnifiedRecordAction({
                ...data,
                eoNumber: payloadEoNumber,
                description: raportDescription,
                address: payloadAddress,
                category: payloadCategory,
                concernsBpp: payloadConcernsBpp,
                officerIds: payloadOfficerIds,
                ...payloadInvestigation,
            })
            if (result.success) {
                toast.success(isEdit ? "Запис оновлено" : "Запис успішно збережено")
                setIsOpen(false)
                if (!isEdit) form.reset()
            }
        } catch (error: any) {
            toast.error(error.message || "Помилка збереження")
        } finally {
            setIsLoading(false)
        }
    }

    const onInvalid = (errors: any) => {
        const firstError = Object.values(errors || {}).find((v: any) => v?.message) as { message?: string } | undefined
        toast.error(firstError?.message || "Перевірте обовʼязкові поля форми")
    }

    useEffect(() => {
        if (!isOpen) return

        setTaggedOfficers((initialData as any)?.officers || [])
        setOfficerSearchQuery("")
        setOfficerSearchResults([])
        setForceUsage(getInitialForceUsage())
        setSubjectFullName("")
        setSubjectBirthDate("")
        setLegalBasis(getInitialLegalBasis())
        setProtocolPrepared("")
        setProtocolNoReason("")
        setProtocolSeries("")
        setProtocolNumber("")
        setProtocolDate("")
        setDetentionFromDate("")
        setDetentionFromTime("")
        setDetentionToDate("")
        setDetentionToTime("")
        setDetentionPurpose(DEFAULT_DETENTION_PURPOSE)
        setDetentionMaterials(DEFAULT_DETENTION_MATERIALS)
        setApplicationBirthDate("")
        setDetentionProtocolSeries("")
        setDetentionProtocolNumber("")
        setSiDocType((initialData as any)?.investigationDocType === "DOPOVIDNA" ? "DOPOVIDNA" : "RAPORT")
        setSiTargetMode((initialData as any)?.investigationTargetType === "BPP" ? "BPP" : "OFFICERS")
        setSiTargetText((initialData as any)?.investigationTargetText || "поліцейських БПП")
        setSiViolation((initialData as any)?.investigationViolation || initialData?.description || "")
        autoOfficerNameRef.current = ""
        autoAddressRef.current = ""
        autoApplicantRef.current = ""
    }, [isOpen, initialData?.id])

    useEffect(() => {
        if (!isOpen) return
        const addressVal = form.getValues("address") || ""
        if ((form.getValues("recordType") === "APPLICATION" || form.getValues("recordType") === "DETENTION_PROTOCOL") && addressVal.startsWith("DOB:")) {
            setApplicationBirthDate(addressVal.replace("DOB:", ""))
        }

        if (form.getValues("recordType") === "DETENTION_PROTOCOL") {
            const val = form.getValues("eoNumber") || ""
            const parsed = parseDetentionProtocolValue(val)
            if (parsed.series || parsed.number) {
                setDetentionProtocolSeries(parsed.series)
                setDetentionProtocolNumber(parsed.number)
            }
        }
    }, [isOpen, form])

    useEffect(() => {
        if (recordType !== "RAPORT" && recordType !== "SERVICE_INVESTIGATION") {
            setOfficerSearchQuery("")
            setOfficerSearchResults([])
            return
        }

        if (recordType === "SERVICE_INVESTIGATION" && siTargetMode === "BPP") {
            setOfficerSearchQuery("")
            setOfficerSearchResults([])
            return
        }

        if (!officerSearchQuery.trim() || officerSearchQuery.length < 2) {
            setOfficerSearchResults([])
            return
        }

        const timer = setTimeout(async () => {
            setIsSearchingOfficers(true)
            try {
                const res = await fetch(`/api/admin/officers?search=${encodeURIComponent(officerSearchQuery)}`)
                if (res.ok) {
                    const data = await res.json()
                    setOfficerSearchResults(data.filter((o: any) => !taggedOfficers.some((to: any) => to.id === o.id)))
                }
            } catch (error) {
                console.error("Officer search error:", error)
            } finally {
                setIsSearchingOfficers(false)
            }
        }, 300)

        return () => clearTimeout(timer)
    }, [officerSearchQuery, taggedOfficers, recordType, siTargetMode])

    useEffect(() => {
        if (recordType !== "RAPORT") return

        const generated = taggedOfficers
            .map((o: any) => formatOfficerForRaport(o))
            .join(", ")

        const current = form.getValues("officerName") || ""
        const prevGenerated = autoOfficerNameRef.current

        // Autocomplete officerName from selected officers only if:
        // 1) field is empty, or 2) field still contains previous auto-generated value
        if (!current.trim() || current === prevGenerated) {
            form.setValue("officerName", generated, { shouldDirty: true })
            autoOfficerNameRef.current = generated
            return
        }

        // User edited manually; keep user text untouched.
    }, [taggedOfficers, recordType, form])

    useEffect(() => {
        if (recordType !== "RAPORT") return
        const generated = buildRaportLegalAddress(legalBasis, subjectFullName, subjectBirthDate)

        const current = form.getValues("address") || ""
        const prevGenerated = autoAddressRef.current

        if (!current.trim() || current === prevGenerated) {
            form.setValue("address", generated, { shouldDirty: true })
            autoAddressRef.current = generated
        }
    }, [legalBasis, subjectFullName, subjectBirthDate, recordType, form])

    useEffect(() => {
        if (recordType !== "RAPORT") return
        const generated = buildProtocolSummary({
            protocolPrepared,
            protocolNoReason,
            protocolSeries,
            protocolNumber,
            detentionFromDate,
            detentionFromTime,
            detentionToDate,
            detentionToTime,
            detentionPurpose,
            detentionMaterials,
        })

        const current = form.getValues("applicant") || ""
        const prevGenerated = autoApplicantRef.current
        if (!current.trim() || current === prevGenerated) {
            form.setValue("applicant", generated, { shouldDirty: true })
            autoApplicantRef.current = generated
        }
    }, [
        protocolPrepared,
        protocolNoReason,
        protocolSeries,
        protocolNumber,
        protocolDate,
        detentionFromDate,
        detentionFromTime,
        detentionToDate,
        detentionToTime,
        detentionPurpose,
        detentionMaterials,
        recordType,
        form
    ])

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                {trigger || (
                    <Button className="bg-blue-600 hover:bg-blue-700 text-white rounded-2xl px-6 h-12 shadow-lg shadow-blue-500/20 group transition-all w-full sm:w-auto justify-center">
                        <Plus className="w-5 h-5 mr-2 group-hover:rotate-90 transition-transform" />
                        Додати запис
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="w-[95%] sm:w-full sm:max-w-[600px] bg-white rounded-[1.5rem] sm:rounded-[2rem] border-none shadow-2xl p-0 overflow-hidden flex flex-col max-h-[90dvh]">
                <DialogHeader className="p-5 sm:p-6 md:p-8 bg-slate-900 text-white flex flex-row items-start justify-between gap-3 sm:gap-4 shrink-0">
                    <div>
                        <DialogTitle className="text-xl md:text-2xl font-black italic uppercase tracking-tight">
                            {isEdit ? "Редагування картки" : "Нова картка запису"}
                        </DialogTitle>
                        <p className="text-slate-400 text-[9px] md:text-[10px] font-bold uppercase tracking-widest mt-1">Використовуйте ШІ для автозаповнення</p>
                    </div>

                    {!isEdit && (
                        <>
                            <input
                                type="file"
                                ref={fileInputRef}
                                className="hidden"
                                accept="image/*"
                                capture="environment"
                                onChange={handleFileSelect}
                            />
                            <Button
                                type="button"
                                onClick={onAiScan}
                                disabled={isAnalyzing}
                                className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-3 md:px-4 h-9 md:h-10 shadow-lg shadow-blue-500/20 gap-2 border-none font-bold text-[10px] md:text-xs"
                            >
                                {isAnalyzing ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                    <Sparkles className="w-3.5 h-3.5" />
                                )}
                                <span className="hidden xs:inline">{isAnalyzing ? "Аналіз..." : "Сканувати ШІ"}</span>
                                <span className="xs:hidden">{isAnalyzing ? "..." : "ШІ"}</span>
                            </Button>
                        </>
                    )}
                </DialogHeader>

                <form onSubmit={form.handleSubmit(onSubmit, onInvalid)} className="p-4 sm:p-6 md:p-8 space-y-5 md:space-y-6 overflow-y-auto custom-scrollbar flex-1 min-h-0">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-6">
                        {recordType !== "DETENTION_PROTOCOL" && (
                            <div className="space-y-2">
                                <Label htmlFor="eoNumber" className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                    {recordType === "APPLICATION"
                                        ? "Рапорт №"
                                        : recordType === "SERVICE_INVESTIGATION"
                                            ? "№ рапорту/доповідної"
                                            : "Номер ЄО"}
                                </Label>
                                {recordType === "RAPORT" || recordType === "APPLICATION" ? (
                                    <div className="h-11 rounded-xl border border-slate-100 bg-slate-50 px-3 flex items-center text-sm font-semibold text-slate-600">
                                        {isEdit
                                            ? `Рапорт №${form.getValues("eoNumber") || "—"}`
                                            : "Буде присвоєно автоматично"}
                                    </div>
                                ) : (
                                    <>
                                        <Input
                                            id="eoNumber"
                                            {...form.register("eoNumber")}
                                            placeholder={recordType === "SERVICE_INVESTIGATION" ? "Напр. 42/26" : "Напр. 1256"}
                                            className="rounded-xl border-slate-100 bg-slate-50 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                            disabled={isEdit}
                                        />
                                        {form.formState.errors.eoNumber && (
                                            <p className="text-[10px] text-red-500 font-bold">{form.formState.errors.eoNumber.message}</p>
                                        )}
                                    </>
                                )}
                            </div>
                        )}

                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Дата</Label>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant={"outline"}
                                        className={cn(
                                            "w-full justify-start text-left font-normal rounded-xl border-slate-100 bg-slate-50 hover:bg-slate-100 transition-all",
                                            !form.getValues("eoDate") && "text-muted-foreground"
                                        )}
                                    >
                                        <CalendarIcon className="mr-2 h-4 w-4 text-blue-500" />
                                        {eoDate ? (
                                            format(eoDate, "PPP", { locale: uk })
                                        ) : (
                                            <span>Оберіть дату</span>
                                        )}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0 rounded-2xl border-none shadow-2xl" align="start">
                                    <Calendar
                                        mode="single"
                                        selected={eoDate}
                                        onSelect={(date) => date && form.setValue("eoDate", date)}
                                        initialFocus
                                        locale={uk}
                                    />
                                </PopoverContent>
                            </Popover>
                        </div>

                        {recordType !== "RAPORT" && recordType !== "SERVICE_INVESTIGATION" && (
                            <div className="space-y-2">
                                <Label htmlFor="applicant" className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                    {recordType === "APPLICATION"
                                        ? "ПІБ до кого застосовано"
                                        : recordType === "DETENTION_PROTOCOL"
                                            ? "ПІБ кого затримали"
                                            : "Заявник"}
                                </Label>
                                <Input
                                    id="applicant"
                                    {...form.register("applicant")}
                                    placeholder={recordType === "APPLICATION" || recordType === "DETENTION_PROTOCOL" ? "ПІБ" : "ПІБ заявника"}
                                    className="rounded-xl border-slate-100 bg-slate-50 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                />
                            </div>
                        )}

                        {recordType === "APPLICATION" || recordType === "DETENTION_PROTOCOL" ? (
                            <div className="space-y-2">
                                <Label htmlFor="applicationBirthDate" className="text-[10px] font-black uppercase tracking-widest text-slate-400">Дата народження</Label>
                                <Input
                                    id="applicationBirthDate"
                                    type="date"
                                    value={applicationBirthDate}
                                    onChange={(e) => setApplicationBirthDate(e.target.value)}
                                    className="rounded-xl border-slate-100 bg-slate-50 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                />
                            </div>
                        ) : null}

                        {recordType === "DETENTION_PROTOCOL" && (
                            <>
                                <div className="space-y-2">
                                    <Label htmlFor="detentionProtocolSeries" className="text-[10px] font-black uppercase tracking-widest text-slate-400">СЕРІЯ ПРОТОКОЛУ затримання</Label>
                                    <Input
                                        id="detentionProtocolSeries"
                                        value={detentionProtocolSeries}
                                        onChange={(e) => setDetentionProtocolSeries(e.target.value)}
                                        placeholder="Серія"
                                        className="rounded-xl border-slate-100 bg-slate-50 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="detentionProtocolNumber" className="text-[10px] font-black uppercase tracking-widest text-slate-400">№ ПРОТОКОЛУ затримання</Label>
                                    <Input
                                        id="detentionProtocolNumber"
                                        value={detentionProtocolNumber}
                                        onChange={(e) => setDetentionProtocolNumber(e.target.value)}
                                        placeholder="Номер"
                                        className="rounded-xl border-slate-100 bg-slate-50 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                    />
                                </div>
                            </>
                        )}

                        {!lockRecordType && (
                            <div className="space-y-2">
                                <Label htmlFor="recordType" className="text-[10px] font-black uppercase tracking-widest text-slate-400">Тип запису</Label>
                                <Select
                                    onValueChange={(val) => form.setValue("recordType", val)}
                                    defaultValue={form.getValues("recordType")}
                                >
                                    <SelectTrigger className="w-full min-w-0 rounded-xl border-slate-100 bg-slate-50 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-bold text-xs md:text-sm [&>span]:truncate">
                                        <SelectValue placeholder="Тип" />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-xl border-none shadow-2xl">
                                        <SelectItem value="EO">Єдиний облік (ЄО)</SelectItem>
                                        <SelectItem value="ZVERN">Звернення</SelectItem>
                                        <SelectItem value="APPLICATION">Застосування сили/спецзасобів</SelectItem>
                                        <SelectItem value="DETENTION_PROTOCOL">Протоколи затримання</SelectItem>
                                        <SelectItem value="SERVICE_INVESTIGATION">Службові розслідування</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        )}

                        <div className="space-y-2">
                            <Label htmlFor="assignedUserId" className="text-[10px] font-black uppercase tracking-widest text-slate-400">Виконавець (хто розгляне)</Label>
                            <Select
                                onValueChange={(val) => form.setValue("assignedUserId", val)}
                                defaultValue={form.getValues("assignedUserId") || undefined}
                            >
                                <SelectTrigger className="w-full min-w-0 rounded-xl border-slate-100 bg-slate-50 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-xs md:text-sm [&>span]:truncate">
                                    <SelectValue placeholder="Оберіть інспектора" />
                                </SelectTrigger>
                                <SelectContent className="rounded-xl border-none shadow-2xl">
                                    {users.map(user => (
                                        <SelectItem key={user.id} value={user.id}>
                                            {user.lastName} {user.firstName} ({user.username})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                    </div>

                    {recordType === "RAPORT" ? (
                        <div className="space-y-4">
                            <div className="rounded-2xl border border-violet-200 bg-violet-50/40 p-4">
                                <p className="text-[10px] font-black uppercase tracking-widest text-violet-700">Рапорт застосування</p>
                                <p className="text-xs font-medium text-slate-700 mt-1">
                                    Заповніть форму максимально близько до тексту оригінального рапорту.
                                </p>
                                <p className="text-[11px] font-bold text-rose-600 mt-2">Зірочка (*) позначає обовʼязкове поле</p>
                            </div>

                            <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-2">
                                <Label htmlFor="officerName" className="text-sm font-black tracking-tight text-slate-800">
                                    Ким застосовано зброю, фізичну силу чи спеціальні засоби <span className="text-rose-600">*</span>
                                </Label>
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                                    Додати поліцейських зі списку:
                                </p>

                                {taggedOfficers.length > 0 && (
                                    <div className="flex flex-wrap gap-2 mb-1">
                                        {taggedOfficers.map((o: any) => (
                                            <div key={o.id} className="flex items-center gap-2 bg-blue-50 text-blue-600 border border-blue-100 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-tight">
                                                <span>{formatOfficerForRaport(o)}</span>
                                                <button
                                                    type="button"
                                                    onClick={() => setTaggedOfficers(taggedOfficers.filter((to: any) => to.id !== o.id))}
                                                    className="hover:text-blue-800"
                                                >
                                                    <XCircle className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                <div className="relative">
                                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                    <Input
                                        placeholder="Прізвище або жетон..."
                                        value={officerSearchQuery}
                                        onChange={(e) => setOfficerSearchQuery(e.target.value)}
                                        className="pl-10 h-11 rounded-xl border-slate-200 text-sm"
                                    />

                                    {officerSearchResults.length > 0 && (
                                        <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xl z-50 max-h-64 overflow-y-auto">
                                            {officerSearchResults.map((o: any) => (
                                                <button
                                                    type="button"
                                                    key={o.id}
                                                    onClick={() => {
                                                        setTaggedOfficers([...taggedOfficers, o])
                                                        setOfficerSearchQuery("")
                                                        setOfficerSearchResults([])
                                                    }}
                                                    className="w-full flex items-center justify-between p-3 hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-0"
                                                >
                                                    <div className="text-left">
                                                        <p className="text-sm font-bold text-slate-900">{o.lastName} {o.firstName}</p>
                                                        <p className="text-[10px] text-slate-400 uppercase font-black">{o.badgeNumber} • {o.rank || 'Офіцер'}</p>
                                                    </div>
                                                    <div className="w-6 h-6 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                                                        <UserPlus className="w-3.5 h-3.5" />
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    )}

                                    {isSearchingOfficers && (
                                        <div className="absolute right-4 top-1/2 -translate-y-1/2">
                                            <Loader2 className="w-4 h-4 text-slate-400 animate-spin" />
                                        </div>
                                    )}
                                </div>
                                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                                    Обрано поліцейських: {taggedOfficers.length}
                                </p>
                                <Textarea
                                    id="officerName"
                                    {...form.register("officerName")}
                                    placeholder="Ваша відповідь"
                                    className="rounded-xl border-slate-200 bg-slate-50 min-h-[110px]"
                                />
                            </div>

                            <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-2">
                                <Label htmlFor="description" className="text-sm font-black tracking-tight text-slate-800">
                                    Дата застосування зброї, фізичної сили чи спеціальних засобів (що саме застосовано, період) <span className="text-rose-600">*</span>
                                </Label>
                                <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
                                    {(Object.keys(forceLabels) as ForceKey[]).map((key) => (
                                        <div key={key} className="rounded-lg bg-white p-3 border border-slate-100 space-y-2">
                                            <label className="flex items-center gap-3">
                                                <Checkbox
                                                    checked={forceUsage[key].enabled}
                                                    onCheckedChange={(val) => updateForceUsage(key, { enabled: val === true })}
                                                />
                                                <span className="text-sm font-bold text-slate-800">{forceLabels[key]}</span>
                                            </label>

                                            {forceUsage[key].enabled && (
                                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                                    <Input
                                                        type="date"
                                                        value={forceUsage[key].date}
                                                        onChange={(e) => updateForceUsage(key, { date: e.target.value })}
                                                        className="rounded-lg bg-white border-slate-200 h-10"
                                                    />
                                                    {key === "handcuffs" ? (
                                                        <>
                                                            <Input
                                                                type="time"
                                                                value={forceUsage[key].from}
                                                                onChange={(e) => updateForceUsage(key, { from: e.target.value })}
                                                                className="rounded-lg bg-white border-slate-200 h-10"
                                                            />
                                                            <Input
                                                                type="time"
                                                                value={forceUsage[key].to}
                                                                onChange={(e) => updateForceUsage(key, { to: e.target.value })}
                                                                className="rounded-lg bg-white border-slate-200 h-10"
                                                            />
                                                            <p className="text-[10px] text-slate-500 sm:col-span-3">
                                                                Якщо час "по" менший за "з", система вважає завершення наступного дня.
                                                            </p>
                                                        </>
                                                    ) : (
                                                        <Input
                                                            type="time"
                                                            value={forceUsage[key].time}
                                                            onChange={(e) => updateForceUsage(key, { time: e.target.value })}
                                                            className="rounded-lg bg-white border-slate-200 h-10 sm:col-span-2"
                                                        />
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                                {form.formState.errors.description && (
                                    <p className="text-[10px] font-bold text-rose-600">{form.formState.errors.description.message}</p>
                                )}
                            </div>

                            <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-2">
                                <Label className="text-sm font-black tracking-tight text-slate-800">
                                    До кого застосовано (ПІБ та дата народження) <span className="text-rose-600">*</span>
                                </Label>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                    <Input
                                        value={subjectFullName}
                                        onChange={(e) => setSubjectFullName(e.target.value)}
                                        placeholder="ПІБ особи"
                                        className="rounded-xl border-slate-200 bg-slate-50 h-11"
                                    />
                                    <Input
                                        type="date"
                                        value={subjectBirthDate}
                                        onChange={(e) => setSubjectBirthDate(e.target.value)}
                                        className="rounded-xl border-slate-200 bg-slate-50 h-11"
                                    />
                                </div>
                            </div>

                            <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3">
                                <Label className="text-sm font-black tracking-tight text-slate-800">
                                    Правові підстави (ст.44/45) <span className="text-rose-600">*</span>
                                </Label>

                                <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
                                    <p className="text-xs font-black uppercase tracking-widest text-slate-500">Стаття 44</p>
                                    <label className="flex items-start gap-2">
                                        <Checkbox
                                            checked={legalBasis.art44_p1_force}
                                            onCheckedChange={(val) => setLegalBasis(prev => ({ ...prev, art44_p1_force: val === true }))}
                                        />
                                        <span className="text-sm text-slate-700">ч.1 - застосування фізичної сили</span>
                                    </label>
                                </div>

                                <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
                                    <p className="text-xs font-black uppercase tracking-widest text-slate-500">Стаття 45 - кайданки (ч.3 п.1)</p>
                                    <label className="flex items-start gap-2"><Checkbox checked={legalBasis.art45_p1_a_handcuffs} onCheckedChange={(val) => setLegalBasis(prev => ({ ...prev, art45_p1_a_handcuffs: val === true }))} /><span className="text-sm text-slate-700">пп.а) підозра у кримінальному правопорушенні, опір/втеча</span></label>
                                    <label className="flex items-start gap-2"><Checkbox checked={legalBasis.art45_p1_b_handcuffs} onCheckedChange={(val) => setLegalBasis(prev => ({ ...prev, art45_p1_b_handcuffs: val === true }))} /><span className="text-sm text-slate-700">пп.б) під час затримання особи</span></label>
                                    <label className="flex items-start gap-2"><Checkbox checked={legalBasis.art45_p1_v_handcuffs} onCheckedChange={(val) => setLegalBasis(prev => ({ ...prev, art45_p1_v_handcuffs: val === true }))} /><span className="text-sm text-slate-700">пп.в) під час конвоювання</span></label>
                                    <label className="flex items-start gap-2"><Checkbox checked={legalBasis.art45_p1_g_handcuffs} onCheckedChange={(val) => setLegalBasis(prev => ({ ...prev, art45_p1_g_handcuffs: val === true }))} /><span className="text-sm text-slate-700">пп.г) небезпечні дії, що можуть зашкодити собі/оточуючим</span></label>
                                    <label className="flex items-start gap-2"><Checkbox checked={legalBasis.art45_p1_gg_handcuffs} onCheckedChange={(val) => setLegalBasis(prev => ({ ...prev, art45_p1_gg_handcuffs: val === true }))} /><span className="text-sm text-slate-700">пп.ґ) процесуальні дії за наявності реальної небезпеки</span></label>
                                </div>

                                <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
                                    <p className="text-xs font-black uppercase tracking-widest text-slate-500">Стаття 45 - гумовий кийок (ч.3 п.2)</p>
                                    <label className="flex items-start gap-2"><Checkbox checked={legalBasis.art45_p2_a_baton} onCheckedChange={(val) => setLegalBasis(prev => ({ ...prev, art45_p2_a_baton: val === true }))} /><span className="text-sm text-slate-700">пп.а) відбиття нападу</span></label>
                                    <label className="flex items-start gap-2"><Checkbox checked={legalBasis.art45_p2_b_baton} onCheckedChange={(val) => setLegalBasis(prev => ({ ...prev, art45_p2_b_baton: val === true }))} /><span className="text-sm text-slate-700">пп.б) затримання при злісній непокорі</span></label>
                                    <label className="flex items-start gap-2"><Checkbox checked={legalBasis.art45_p2_v_baton} onCheckedChange={(val) => setLegalBasis(prev => ({ ...prev, art45_p2_v_baton: val === true }))} /><span className="text-sm text-slate-700">пп.в) припинення групового порушення/заворушень</span></label>
                                </div>

                                <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
                                    <p className="text-xs font-black uppercase tracking-widest text-slate-500">Стаття 45 - сльозогінні/дратівні засоби (ч.3 п.3)</p>
                                    <label className="flex items-start gap-2"><Checkbox checked={legalBasis.art45_p3_a_teargas} onCheckedChange={(val) => setLegalBasis(prev => ({ ...prev, art45_p3_a_teargas: val === true }))} /><span className="text-sm text-slate-700">пп.а) відбиття нападу</span></label>
                                    <label className="flex items-start gap-2"><Checkbox checked={legalBasis.art45_p3_b_teargas} onCheckedChange={(val) => setLegalBasis(prev => ({ ...prev, art45_p3_b_teargas: val === true }))} /><span className="text-sm text-slate-700">пп.б) припинення групового порушення/заворушень</span></label>
                                </div>
                            </div>

                            <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-2">
                                <Label htmlFor="address" className="text-sm font-black tracking-tight text-slate-800">
                                    Підстава застосування, до кого застосовано <span className="text-rose-600">*</span>
                                </Label>
                                <Textarea
                                    id="address"
                                    {...form.register("address")}
                                    placeholder="Ваша відповідь"
                                    className="rounded-xl border-slate-200 bg-slate-50 min-h-[110px]"
                                />
                            </div>

                            <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-2">
                                <Label htmlFor="applicant" className="text-sm font-black tracking-tight text-slate-800">
                                    Дані про оформлення протоколу про адмінзатримання (КУпАП), строки затримання <span className="text-rose-600">*</span>
                                </Label>
                                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-3">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <span className="text-xs font-black uppercase tracking-widest text-slate-500">Протокол затримання складався?</span>
                                        <Button
                                            type="button"
                                            variant={protocolPrepared === "YES" ? "default" : "outline"}
                                            className="h-8 rounded-lg text-xs font-black"
                                            onClick={() => setProtocolPrepared("YES")}
                                        >
                                            Так
                                        </Button>
                                        <Button
                                            type="button"
                                            variant={protocolPrepared === "NO" ? "default" : "outline"}
                                            className="h-8 rounded-lg text-xs font-black"
                                            onClick={() => setProtocolPrepared("NO")}
                                        >
                                            Ні
                                        </Button>
                                    </div>

                                    {protocolPrepared === "NO" && (
                                        <Input
                                            value={protocolNoReason}
                                            onChange={(e) => setProtocolNoReason(e.target.value)}
                                            placeholder="Вкажіть причину застосування (напр. доставлення психічно хворого, затриманий в порядку ст.207 КПК...)"
                                            className="rounded-lg bg-white border-slate-200 h-10"
                                        />
                                    )}

                                    {protocolPrepared === "YES" && (
                                        <>
                                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                                <Input
                                                    value={protocolSeries}
                                                    onChange={(e) => setProtocolSeries(e.target.value)}
                                                    placeholder="Серія протоколу"
                                                    className="rounded-lg bg-white border-slate-200 h-10"
                                                />
                                                <Input
                                                    value={protocolNumber}
                                                    onChange={(e) => setProtocolNumber(e.target.value)}
                                                    placeholder="Номер протоколу"
                                                    className="rounded-lg bg-white border-slate-200 h-10"
                                                />
                                                <Input
                                                    type="date"
                                                    value={protocolDate}
                                                    onChange={(e) => setProtocolDate(e.target.value)}
                                                    className="rounded-lg bg-white border-slate-200 h-10"
                                                />
                                            </div>

                                            <Input
                                                value={detentionPurpose}
                                                onChange={(e) => setDetentionPurpose(e.target.value)}
                                                placeholder="Мета затримання"
                                                className="rounded-lg bg-white border-slate-200 h-10"
                                            />

                                            <Input
                                                value={detentionMaterials}
                                                onChange={(e) => setDetentionMaterials(e.target.value)}
                                                placeholder="Які матеріали складалися"
                                                className="rounded-lg bg-white border-slate-200 h-10"
                                            />

                                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                                <Input type="date" value={detentionFromDate} onChange={(e) => setDetentionFromDate(e.target.value)} className="rounded-lg bg-white border-slate-200 h-10" />
                                                <Input type="time" value={detentionFromTime} onChange={(e) => setDetentionFromTime(e.target.value)} className="rounded-lg bg-white border-slate-200 h-10" />
                                                <Input type="date" value={detentionToDate} onChange={(e) => setDetentionToDate(e.target.value)} className="rounded-lg bg-white border-slate-200 h-10" />
                                                <Input type="time" value={detentionToTime} onChange={(e) => setDetentionToTime(e.target.value)} className="rounded-lg bg-white border-slate-200 h-10" />
                                            </div>
                                        </>
                                    )}
                                </div>
                                <Textarea
                                    id="applicant"
                                    {...form.register("applicant")}
                                    placeholder="Ваша відповідь"
                                    className="rounded-xl border-slate-200 bg-slate-50 min-h-[110px]"
                                />
                            </div>
                        </div>
                    ) : recordType === "SERVICE_INVESTIGATION" ? (
                        <div className="space-y-4">
                            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/40 p-4">
                                <p className="text-[10px] font-black uppercase tracking-widest text-emerald-700">Службове розслідування</p>
                                <p className="text-xs font-medium text-slate-700 mt-1">
                                    Строк розгляду рапорту/доповідної: 15 днів. Після призначення СР строк рахується 15 днів від дати наказу.
                                </p>
                            </div>

                            <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3">
                                <Label className="text-sm font-black tracking-tight text-slate-800">Тип документа</Label>
                                <div className="grid grid-cols-2 gap-2">
                                    <Button
                                        type="button"
                                        variant={siDocType === "RAPORT" ? "default" : "outline"}
                                        className="h-10 rounded-xl font-bold"
                                        onClick={() => setSiDocType("RAPORT")}
                                    >
                                        Рапорт
                                    </Button>
                                    <Button
                                        type="button"
                                        variant={siDocType === "DOPOVIDNA" ? "default" : "outline"}
                                        className="h-10 rounded-xl font-bold"
                                        onClick={() => setSiDocType("DOPOVIDNA")}
                                    >
                                        Доповідна записка
                                    </Button>
                                </div>
                            </div>

                            <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3">
                                <Label className="text-sm font-black tracking-tight text-slate-800">
                                    Відносно якого поліцейського / поліцейських
                                </Label>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    <Button
                                        type="button"
                                        variant={siTargetMode === "OFFICERS" ? "default" : "outline"}
                                        className="h-10 rounded-xl font-bold"
                                        onClick={() => setSiTargetMode("OFFICERS")}
                                    >
                                        Обрати поліцейських
                                    </Button>
                                    <Button
                                        type="button"
                                        variant={siTargetMode === "BPP" ? "default" : "outline"}
                                        className="h-10 rounded-xl font-bold"
                                        onClick={() => setSiTargetMode("BPP")}
                                    >
                                        Відносно поліцейських БПП
                                    </Button>
                                </div>

                                {siTargetMode === "OFFICERS" ? (
                                    <div className="space-y-2">
                                        {taggedOfficers.length > 0 && (
                                            <div className="flex flex-wrap gap-2 mb-1">
                                                {taggedOfficers.map((officer: any) => (
                                                    <div key={officer.id} className="flex items-center gap-2 bg-blue-50 text-blue-600 border border-blue-100 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-tight">
                                                        <span>{officer.lastName} {officer.firstName} {officer.badgeNumber ? `(${officer.badgeNumber})` : ""}</span>
                                                        <button
                                                            type="button"
                                                            onClick={() => setTaggedOfficers(taggedOfficers.filter((item: any) => item.id !== officer.id))}
                                                            className="hover:text-blue-800"
                                                        >
                                                            <XCircle className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        <div className="relative">
                                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                            <Input
                                                placeholder="Прізвище або жетон..."
                                                value={officerSearchQuery}
                                                onChange={(e) => setOfficerSearchQuery(e.target.value)}
                                                className="pl-10 h-11 rounded-xl border-slate-200 text-sm"
                                            />

                                            {officerSearchResults.length > 0 && (
                                                <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xl z-50 max-h-64 overflow-y-auto">
                                                    {officerSearchResults.map((officer: any) => (
                                                        <button
                                                            type="button"
                                                            key={officer.id}
                                                            onClick={() => {
                                                                setTaggedOfficers([...taggedOfficers, officer])
                                                                setOfficerSearchQuery("")
                                                                setOfficerSearchResults([])
                                                            }}
                                                            className="w-full flex items-center justify-between p-3 hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-0"
                                                        >
                                                            <div className="text-left">
                                                                <p className="text-sm font-bold text-slate-900">{officer.lastName} {officer.firstName}</p>
                                                                <p className="text-[10px] text-slate-400 uppercase font-black">{officer.badgeNumber} • {officer.rank || 'Офіцер'}</p>
                                                            </div>
                                                            <div className="w-6 h-6 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                                                                <UserPlus className="w-3.5 h-3.5" />
                                                            </div>
                                                        </button>
                                                    ))}
                                                </div>
                                            )}

                                            {isSearchingOfficers && (
                                                <div className="absolute right-4 top-1/2 -translate-y-1/2">
                                                    <Loader2 className="w-4 h-4 text-slate-400 animate-spin" />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ) : (
                                    <Input
                                        value={siTargetText}
                                        onChange={(e) => setSiTargetText(e.target.value)}
                                        placeholder="Напр. поліцейських БПП"
                                        className="rounded-xl border-slate-200 bg-slate-50 h-11"
                                    />
                                )}
                            </div>

                            <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-2">
                                <Label className="text-sm font-black tracking-tight text-slate-800">
                                    Яке порушення <span className="text-rose-600">*</span>
                                </Label>
                                <Textarea
                                    value={siViolation}
                                    onChange={(e) => setSiViolation(e.target.value)}
                                    placeholder="Опишіть суть порушення службової дисципліни"
                                    className="rounded-xl border-slate-200 bg-slate-50 min-h-[120px]"
                                />
                            </div>
                        </div>
                    ) : (
                        <>
                            {recordType !== "APPLICATION" && recordType !== "DETENTION_PROTOCOL" && (
                                <>
                                    <div className="space-y-2">
                                        <Label htmlFor="description" className="text-[10px] font-black uppercase tracking-widest text-slate-400">Подія</Label>
                                        <Input
                                            id="description"
                                            {...form.register("description")}
                                            placeholder="Напр. ІНШІ СКАРГИ..."
                                            className="rounded-xl border-slate-100 bg-slate-50 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-bold uppercase"
                                        />
                                        {form.formState.errors.description && (
                                            <p className="text-[10px] text-red-500 font-bold">{form.formState.errors.description.message}</p>
                                        )}
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="address" className="text-[10px] font-black uppercase tracking-widest text-slate-400">Адреса</Label>
                                        <Input
                                            id="address"
                                            {...form.register("address")}
                                            placeholder="Місце події"
                                            className="rounded-xl border-slate-100 bg-slate-50 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                        />
                                    </div>
                                </>
                            )}
                        </>
                    )}
                </form>

                <DialogFooter className="p-4 md:p-8 bg-slate-50 border-t border-slate-100 flex flex-col-reverse sm:flex-row gap-2 md:gap-4 items-stretch sm:items-center justify-between shrink-0 sticky bottom-0">
                    <Button
                        type="button"
                        variant="ghost"
                        onClick={() => {
                            form.reset()
                            setIsOpen(false)
                        }}
                        className="rounded-xl font-bold text-slate-500 hover:text-slate-900 flex-1 md:flex-none"
                    >
                        Скасувати
                    </Button>
                    <Button
                        type="button"
                        onClick={form.handleSubmit(onSubmit, onInvalid)}
                        disabled={isLoading}
                        className="bg-slate-900 hover:bg-black text-white rounded-xl px-4 md:px-8 h-10 shadow-lg shadow-slate-900/20 transition-all flex-1 md:flex-none"
                    >
                        {isLoading ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                <span className="hidden xs:inline">Зберігаємо...</span>
                                <span className="xs:hidden">...</span>
                            </>
                        ) : (
                            isEdit ? "Оновити" : "Зберегти"
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
