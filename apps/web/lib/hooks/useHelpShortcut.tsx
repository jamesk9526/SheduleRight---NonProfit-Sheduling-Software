'use client'

import { useEffect, useCallback } from 'react'
import { useRouter, usePathname } from 'next/navigation'

/**
 * Global keyboard shortcut handler for help center
 * Listens for ? or Ctrl+K / Cmd+K to open help page
 */
export function useHelpShortcut() {
  const router = useRouter()
  const pathname = usePathname()

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      // Ignore if user is typing in an input/textarea
      const target = event.target as HTMLElement
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        // Allow Ctrl+K even in inputs (common pattern)
        if (!(event.key === 'k' && (event.ctrlKey || event.metaKey))) {
          return
        }
      }

      // Handle ? key (question mark)
      if (event.key === '?' && !event.ctrlKey && !event.metaKey && !event.altKey) {
        event.preventDefault()
        router.push('/help')
        return
      }

      // Handle Ctrl+K or Cmd+K
      if (event.key === 'k' && (event.ctrlKey || event.metaKey)) {
        event.preventDefault()
        router.push('/help')
        return
      }
    },
    [router]
  )

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [handleKeyDown])
}

/**
 * Component to wrap the entire app and enable keyboard shortcuts
 */
export function HelpShortcutProvider({ children }: { children: React.ReactNode }) {
  useHelpShortcut()
  return <>{children}</>
}
