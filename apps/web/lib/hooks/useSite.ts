'use client'

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'

export interface SiteContextType {
  currentSiteId: string | null
  setSiteId: (siteId: string) => void
  clearSiteId: () => void
}

const SiteContext = createContext<SiteContextType | undefined>(undefined)

/**
 * Provider component for site context
 * Manages current site selection across the app
 */
export function SiteProvider(props: { children: ReactNode }) {
  const { children } = props
  const [currentSiteId, setCurrentSiteId] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem('currentSiteId')
    if (saved) {
      setCurrentSiteId(saved)
    }
    setMounted(true)
  }, [])

  const setSiteId = (siteId: string) => {
    setCurrentSiteId(siteId)
    localStorage.setItem('currentSiteId', siteId)
  }

  const clearSiteId = () => {
    setCurrentSiteId(null)
    localStorage.removeItem('currentSiteId')
  }

  if (!mounted) {
    return null
  }

  const contextValue: SiteContextType = {
    currentSiteId,
    setSiteId,
    clearSiteId,
  }

  return React.createElement(
    SiteContext.Provider,
    { value: contextValue },
    children
  )
}

/**
 * Hook to use site context
 */
export function useSite(): SiteContextType {
  const context = useContext(SiteContext)
  if (!context) {
    throw new Error('useSite must be used within SiteProvider')
  }
  return context
}
