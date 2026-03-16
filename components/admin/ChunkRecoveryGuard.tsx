'use client'

import { useEffect } from 'react'
import { clearAdminSessionMarkers } from '@/lib/client/admin-session'

const CHUNK_RECOVERY_KEY = 'admin:chunk-recovery-at'

function readMessage(value: unknown) {
  if (value instanceof Error) return value.message || ''
  return typeof value === 'string' ? value : String(value || '')
}

function isChunkFailure(message: string) {
  const normalized = message.toLowerCase()
  return (
    normalized.includes('chunkloaderror') ||
    normalized.includes('loading chunk') ||
    normalized.includes('failed to fetch dynamically imported module') ||
    normalized.includes('/_next/static/chunks/') ||
    normalized.includes('loading css chunk')
  )
}

function recoverFromChunkFailure() {
  try {
    clearAdminSessionMarkers()
  } catch {
    // ignore
  }

  const stamp = Date.now()
  try {
    window.sessionStorage.setItem(CHUNK_RECOVERY_KEY, String(stamp))
  } catch {
    // ignore
  }

  window.location.replace(`/admin/login?recovered=${stamp}`)
}

export function ChunkRecoveryGuard() {
  useEffect(() => {
    const handleError = (event: Event) => {
      const target = event.target as HTMLScriptElement | HTMLLinkElement | null

      if (
        target &&
        ((target.tagName === 'SCRIPT' && 'src' in target && target.src.includes('/_next/static/chunks/')) ||
          (target.tagName === 'LINK' && 'href' in target && target.href.includes('/_next/static/')))
      ) {
        recoverFromChunkFailure()
        return
      }

      if (event instanceof ErrorEvent && isChunkFailure(readMessage(event.error || event.message))) {
        recoverFromChunkFailure()
      }
    }

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      if (isChunkFailure(readMessage(event.reason))) {
        event.preventDefault()
        recoverFromChunkFailure()
      }
    }

    window.addEventListener('error', handleError, true)
    window.addEventListener('unhandledrejection', handleUnhandledRejection)

    return () => {
      window.removeEventListener('error', handleError, true)
      window.removeEventListener('unhandledrejection', handleUnhandledRejection)
    }
  }, [])

  return null
}
