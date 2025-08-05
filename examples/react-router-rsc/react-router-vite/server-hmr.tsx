'use client'

import React from 'react'
import { useNavigate } from 'react-router'

export function ServerHmr() {
  if (import.meta.hot) {
    const navigate = useNavigate()
    React.useEffect(() => {
      const refetch = () =>
        navigate(window.location.pathname, { replace: true })
      import.meta.hot!.on('rsc:update', refetch)
      return () => {
        import.meta.hot!.off('rsc:update', refetch)
      }
    }, [navigate])
  }
  return null
}
