"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Loader2, PhoneCall, Search, Shield, User as UserIcon, X } from "lucide-react"
import { cn } from "@/lib/utils"

type ResultRow = {
  id: string
  type: "unified-record" | "callback" | "officer" | "report"
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
  return Search
}

interface Props {
  mode?: "desktop" | "mobile"
}

export default function GlobalSearch({ mode = "desktop" }: Props) {
  const router = useRouter()
  const rootRef = useRef<HTMLDivElement>(null)
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

  const showPanel = useMemo(() => {
    const enoughQuery = query.trim().length >= 2
    return effectiveOpen && isOpen && enoughQuery
  }, [effectiveOpen, isOpen, query])

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
              <SearchResults
                isLoading={isLoading}
                query={query}
                results={results}
                onSelect={onSelect}
                className="mt-2 max-h-[45vh] overflow-y-auto"
              />
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
        value={query}
        onFocus={() => setIsOpen(true)}
        onChange={(event) => {
          setQuery(event.target.value)
          setIsOpen(true)
        }}
        className="h-10 rounded-xl border-slate-200 bg-slate-50 pl-9 pr-3 text-sm"
        placeholder="Глобальний пошук: ЄО, ПІБ, жетон, протокол, callback"
      />
      {showPanel ? (
        <SearchResults
          isLoading={isLoading}
          query={query}
          results={results}
          onSelect={onSelect}
          className="absolute left-0 top-[44px] z-[60] max-h-[65vh] w-full overflow-y-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl"
        />
      ) : null}
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
