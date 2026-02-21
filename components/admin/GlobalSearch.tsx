"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Loader2, PhoneCall, Search, Shield, User as UserIcon, X } from "lucide-react"
import { cn } from "@/lib/utils"

type ResultRow = {
  id: string
  type: "unified-record" | "callback" | "officer" | "report" | "navigation"
  title: string
  subtitle: string
  href: string
  status?: string
}

const typeLabel: Record<ResultRow["type"], string> = {
  "unified-record": "ЄО/Реєстр",
  callback: "Callback",
  officer: "Поліцейський",
  report: "Опитування",
  navigation: "Навігація",
}

function statusLabel(status?: string) {
  if (!status) return null
  if (status === "PROCESSED" || status === "COMPLETED" || status === "RESOLVED") {
    return { text: "Опрацьовано", className: "status-chip-processed" }
  }
  if (status === "ASSIGNED" || status === "IN_PROGRESS") {
    return { text: "В роботі", className: "status-chip-progress" }
  }
  if (status === "PENDING" || status === "NEW") {
    return { text: "Очікує", className: "status-chip-waiting" }
  }
  return { text: status, className: "ds-chip-muted" }
}

function iconForType(type: ResultRow["type"]) {
  if (type === "callback") return PhoneCall
  if (type === "officer") return Shield
  if (type === "report") return UserIcon
  if (type === "navigation") return Search
  return Search
}

function normalizeSearchText(value: string) {
  return value
    .toLocaleLowerCase("uk-UA")
    .replace(/[’'`"]/g, "")
    .replace(/\s+/g, " ")
    .trim()
}

function isSubsequenceMatch(needle: string, haystack: string) {
  if (!needle) return true
  let i = 0
  for (let j = 0; j < haystack.length && i < needle.length; j++) {
    if (needle[i] === haystack[j]) i++
  }
  return i === needle.length
}

interface Props {
  mode?: "desktop" | "mobile"
}

type QuickAction = {
  id: string
  title: string
  subtitle: string
  href: string
}

export default function GlobalSearch({ mode = "desktop" }: Props) {
  const router = useRouter()
  const rootRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [isMobileOpen, setIsMobileOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<ResultRow[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const effectiveOpen = mode === "mobile" ? isMobileOpen : true

  useEffect(() => {
    const handler = (event: MouseEvent) => {
      if (!rootRef.current) return
      if (!rootRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  useEffect(() => {
    if (!effectiveOpen) return
    const q = query.trim()
    if (q.length < 2) {
      setResults([])
      setIsLoading(false)
      return
    }

    const controller = new AbortController()
    setIsLoading(true)
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/admin/search?q=${encodeURIComponent(q)}`, {
          method: "GET",
          signal: controller.signal,
          cache: "no-store",
        })
        if (!res.ok) {
          setResults([])
          return
        }
        const data = await res.json()
        setResults(Array.isArray(data?.results) ? data.results : [])
      } catch {
        setResults([])
      } finally {
        setIsLoading(false)
      }
    }, 240)

    return () => {
      controller.abort()
      clearTimeout(timer)
    }
  }, [query, effectiveOpen])

  useEffect(() => {
    if (mode !== "desktop") return

    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault()
        setIsOpen(true)
        setTimeout(() => inputRef.current?.focus(), 0)
      }
      if (event.key === "Escape") {
        setIsOpen(false)
      }
    }

    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [mode])

  const quickActions = useMemo<QuickAction[]>(() => ([
    {
      id: "create-eo",
      title: "Створити ЄО / запис",
      subtitle: "Перейти в Єдиний облік",
      href: "/admin/unified-record",
    },
    {
      id: "open-overdue",
      title: "Прострочені дедлайни",
      subtitle: "Показати прострочені записи",
      href: "/admin/unified-record?quickPreset=OVERDUE",
    },
    {
      id: "open-unassigned",
      title: "Без виконавця",
      subtitle: "Показати непризначені записи",
      href: "/admin/unified-record?quickPreset=UNASSIGNED",
    },
    {
      id: "create-callback",
      title: "Створити callback",
      subtitle: "Перейти до callback-карток",
      href: "/admin/callbacks",
    },
  ]), [])

  const navigationResults = useMemo<Array<ResultRow & { keywords: string[] }>>(() => ([
    {
      id: "nav-dashboard",
      type: "navigation",
      title: "Дашборд",
      subtitle: "Головна панель моніторингу",
      href: "/admin/dashboard",
      keywords: ["дашборд", "головна", "моніторинг", "панель"],
    },
    {
      id: "nav-analytics",
      type: "navigation",
      title: "Аналітика",
      subtitle: "Статистика та звіти",
      href: "/admin/analytics",
      keywords: ["аналітика", "звіт", "статистика", "діаграма"],
    },
    {
      id: "nav-reports",
      type: "navigation",
      title: "Відгуки громадян",
      subtitle: "Опитування та звернення громадян",
      href: "/admin/reports",
      keywords: ["відгуки", "опитування", "громадян", "оцінка"],
    },
    {
      id: "nav-unified-all",
      type: "navigation",
      title: "Виконавча дисципліна",
      subtitle: "Всі документи в роботі",
      href: "/admin/unified-record?activeTab=ALL&status=PENDING",
      keywords: ["виконавча дисципліна", "єо", "звернення", "рапорт", "протокол", "скарга", "порушення"],
    },
    {
      id: "nav-unified-eo",
      type: "navigation",
      title: "Єдиний облік",
      subtitle: "Реєстр ЄО",
      href: "/admin/unified-record?activeTab=EO",
      keywords: ["єо", "єдиний облік", "облік", "номер єо"],
    },
    {
      id: "nav-unified-zvern",
      type: "navigation",
      title: "Звернення",
      subtitle: "Категорія звернень",
      href: "/admin/unified-record?activeTab=ZVERN",
      keywords: ["звернення", "скарга", "заявник"],
    },
    {
      id: "nav-unified-application",
      type: "navigation",
      title: "Застосування сили/спецзасобів",
      subtitle: "Рапорти застосування",
      href: "/admin/unified-record?activeTab=APPLICATION",
      keywords: ["застосування", "сили", "спецзасобів", "рапорт застосування"],
    },
    {
      id: "nav-unified-detention",
      type: "navigation",
      title: "Протоколи затримання",
      subtitle: "Протоколи затримання",
      href: "/admin/unified-record?activeTab=DETENTION_PROTOCOL",
      keywords: ["затримання", "протокол", "серія", "номер протоколу"],
    },
    {
      id: "nav-unified-sr",
      type: "navigation",
      title: "Службові розслідування",
      subtitle: "Облік службових розслідувань",
      href: "/admin/unified-record?activeTab=SERVICE_INVESTIGATION",
      keywords: ["службові розслідування", "ср", "дисципліна", "наказ"],
    },
    {
      id: "nav-unified-approval",
      type: "navigation",
      title: "Керівнику на погодження",
      subtitle: "Документи на етапі погодження",
      href: "/admin/unified-record?activeTab=ALL&status=APPROVAL",
      keywords: ["погодження", "керівнику", "на погодження", "перевірка керівником"],
    },
    {
      id: "nav-callbacks",
      type: "navigation",
      title: "Callback",
      subtitle: "Картки зворотного звʼязку",
      href: "/admin/callbacks",
      keywords: ["callback", "колбек", "зворотний звязок", "дзвінок", "опрацювання callback"],
    },
    {
      id: "nav-map",
      type: "navigation",
      title: "Мапа",
      subtitle: "Карта подій та локацій",
      href: "/admin/map",
      keywords: ["мапа", "карта", "локація", "координати"],
    },
    {
      id: "nav-officers",
      type: "navigation",
      title: "Особовий склад",
      subtitle: "Картки поліцейських",
      href: "/admin/officers",
      keywords: ["особовий склад", "поліцейські", "жетон", "інспектор", "патруль"],
    },
    {
      id: "nav-citizens",
      type: "navigation",
      title: "Громадяни",
      subtitle: "Досьє громадян",
      href: "/admin/citizens",
      keywords: ["громадяни", "досьє", "контакти"],
    },
    {
      id: "nav-users",
      type: "navigation",
      title: "Користувачі",
      subtitle: "Керування обліковими записами",
      href: "/admin/users",
      keywords: ["користувачі", "дозволи", "ролі", "права"],
    },
    {
      id: "nav-audit",
      type: "navigation",
      title: "Аудит",
      subtitle: "Журнал подій системи",
      href: "/admin/audit",
      keywords: ["аудит", "журнал", "історія дій"],
    },
    {
      id: "nav-settings",
      type: "navigation",
      title: "Налаштування",
      subtitle: "Параметри системи",
      href: "/admin/settings",
      keywords: ["налаштування", "конфігурація", "параметри"],
    },
    {
      id: "nav-profile",
      type: "navigation",
      title: "Мій профіль",
      subtitle: "Профіль користувача",
      href: "/admin/profile",
      keywords: ["профіль", "пароль", "2fa", "двофакторна"],
    },
  ]), [])

  const mergedResults = useMemo(() => {
    const q = normalizeSearchText(query)
    const tokens = q.split(" ").filter((part) => part.length > 0)

    const localMatches: ResultRow[] = q.length >= 2
      ? navigationResults.filter((item) => {
          const searchable = normalizeSearchText(`${item.title} ${item.subtitle} ${item.keywords.join(" ")}`)
          return tokens.every((token) => searchable.includes(token) || isSubsequenceMatch(token, searchable))
        }).map(({ keywords: _keywords, ...row }) => row)
      : []

    const dedup = new Map<string, ResultRow>()
    for (const item of [...localMatches, ...results]) {
      dedup.set(`${item.type}-${item.id}`, item)
    }
    return Array.from(dedup.values()).slice(0, 24)
  }, [navigationResults, query, results])

  const showPanel = useMemo(() => {
    return effectiveOpen && isOpen
  }, [effectiveOpen, isOpen])

  const onSelect = (item: ResultRow) => {
    setIsOpen(false)
    setIsMobileOpen(false)
    setQuery("")
    router.push(item.href)
  }

  if (mode === "mobile") {
    return (
      <div ref={rootRef} className="relative">
        <Button
          type="button"
          variant="ghost"
          className="h-9 w-9 rounded-xl p-0 text-slate-500 hover:bg-slate-100"
          onClick={() => {
            setIsMobileOpen((prev) => !prev)
            setIsOpen(true)
          }}
          aria-label="Глобальний пошук"
        >
          <Search className="h-4 w-4" />
        </Button>

        {isMobileOpen ? (
          <div className="fixed inset-x-2 top-16 z-[70] rounded-2xl border border-slate-200 bg-white p-3 shadow-2xl">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                ref={inputRef}
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value)
                  setIsOpen(true)
                }}
                placeholder="Пошук по системі..."
                className="h-11 rounded-xl pl-9 pr-9"
                autoFocus
              />
              <button
                type="button"
                onClick={() => {
                  setIsMobileOpen(false)
                  setIsOpen(false)
                }}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-500 hover:bg-slate-100"
                aria-label="Закрити пошук"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            {showPanel ? (
              query.trim().length >= 2 ? (
                <SearchResults
                  isLoading={isLoading}
                  query={query}
                  results={mergedResults}
                  onSelect={onSelect}
                  className="mt-2 max-h-[45vh] overflow-y-auto"
                />
              ) : (
                <QuickActionsList
                  actions={quickActions}
                  onSelect={(action) => onSelect({
                    id: action.id,
                    type: "unified-record",
                    title: action.title,
                    subtitle: action.subtitle,
                    href: action.href,
                  })}
                  className="mt-2 max-h-[45vh] overflow-y-auto"
                />
              )
            ) : null}
          </div>
        ) : null}
      </div>
    )
  }

  return (
    <div ref={rootRef} className="relative w-full max-w-md">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      <Input
        ref={inputRef}
        value={query}
        onFocus={() => setIsOpen(true)}
        onChange={(event) => {
          setQuery(event.target.value)
          setIsOpen(true)
        }}
        className="h-10 rounded-xl border-slate-200 bg-slate-50 pl-9 pr-3 text-sm"
        placeholder="Глобальний пошук (Ctrl+K): ЄО, ПІБ, жетон, протокол, callback"
      />
      {showPanel ? (
        query.trim().length >= 2 ? (
          <SearchResults
            isLoading={isLoading}
            query={query}
            results={mergedResults}
            onSelect={onSelect}
            className="absolute left-0 top-[44px] z-[60] max-h-[65vh] w-full overflow-y-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl"
          />
        ) : (
          <QuickActionsList
            actions={quickActions}
            onSelect={(action) => onSelect({
              id: action.id,
              type: "unified-record",
              title: action.title,
              subtitle: action.subtitle,
              href: action.href,
            })}
            className="absolute left-0 top-[44px] z-[60] max-h-[65vh] w-full overflow-y-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl"
          />
        )
      ) : null}
    </div>
  )
}

function QuickActionsList({
  actions,
  onSelect,
  className,
}: {
  actions: QuickAction[]
  onSelect: (action: QuickAction) => void
  className?: string
}) {
  return (
    <div className={cn("space-y-1", className)}>
      <p className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Швидкі дії</p>
      {actions.map((action) => (
        <button
          key={action.id}
          type="button"
          onClick={() => onSelect(action)}
          className="w-full rounded-xl border border-transparent p-2.5 text-left hover:border-blue-200 hover:bg-blue-50/40"
        >
          <p className="text-sm font-semibold text-slate-900">{action.title}</p>
          <p className="mt-0.5 text-xs text-slate-500">{action.subtitle}</p>
        </button>
      ))}
      <p className="px-2 pt-1 text-[11px] text-slate-500">Підказка: натисніть <span className="font-semibold">Ctrl+K</span></p>
    </div>
  )
}

function SearchResults({
  isLoading,
  query,
  results,
  onSelect,
  className,
}: {
  isLoading: boolean
  query: string
  results: ResultRow[]
  onSelect: (item: ResultRow) => void
  className?: string
}) {
  if (isLoading) {
    return (
      <div className={cn("flex items-center justify-center py-6 text-slate-500", className)}>
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="ml-2 text-sm font-medium">Шукаю...</span>
      </div>
    )
  }

  if (results.length === 0) {
    return (
      <div className={cn("py-6 text-center", className)}>
        <p className="text-sm font-semibold text-slate-700">Нічого не знайдено</p>
        <p className="mt-1 text-xs text-slate-500">Запит: {query}</p>
      </div>
    )
  }

  return (
    <div className={cn("space-y-1", className)}>
      {results.map((item) => {
        const Icon = iconForType(item.type)
        const status = statusLabel(item.status)
        return (
          <button
            key={`${item.type}-${item.id}`}
            type="button"
            onClick={() => onSelect(item)}
            className="w-full rounded-xl border border-transparent p-2.5 text-left hover:border-blue-200 hover:bg-blue-50/40"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <Icon className="h-3.5 w-3.5 text-slate-400" />
                  <p className="truncate text-sm font-semibold text-slate-900">{item.title}</p>
                </div>
                <p className="mt-0.5 truncate text-xs text-slate-500">{item.subtitle}</p>
              </div>
              <span className="ds-chip-muted shrink-0 text-[10px]">{typeLabel[item.type]}</span>
            </div>
            {status ? (
              <div className="mt-2">
                <span className={status.className}>{status.text}</span>
              </div>
            ) : null}
          </button>
        )
      })}
    </div>
  )
}
